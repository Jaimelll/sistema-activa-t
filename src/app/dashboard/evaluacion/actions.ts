"use server";

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// ──────────────────────── CONFIG CRUD ────────────────────────

export async function getEvaluacionConfigs() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("evaluacion_config")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching evaluacion configs:", error);
        return [];
    }
    return data || [];
}

export async function createEvaluacionConfig(formData: FormData) {
    const supabase = getSupabase();
    const nombre = formData.get("nombre") as string;
    const pdfBasesFile = formData.get("pdf_bases") as File | null;
    const pdfFormatoFile = formData.get("pdf_formato") as File | null;

    let url_pdf_bases: string | null = null;
    let url_pdf_formato: string | null = null;

    // Upload PDF Bases
    if (pdfBasesFile && pdfBasesFile.size > 0) {
        const fileName = `bases_${Date.now()}_${pdfBasesFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documentos_evaluacion")
            .upload(fileName, pdfBasesFile, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
            console.error("Error uploading PDF bases:", uploadError);
            return { success: false, error: "Error al subir PDF de bases" };
        }
        const { data: urlData } = supabase.storage
            .from("documentos_evaluacion")
            .getPublicUrl(uploadData.path);
        url_pdf_bases = urlData.publicUrl;
    }

    // Upload PDF Formato
    if (pdfFormatoFile && pdfFormatoFile.size > 0) {
        const fileName = `formato_${Date.now()}_${pdfFormatoFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documentos_evaluacion")
            .upload(fileName, pdfFormatoFile, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
            console.error("Error uploading PDF formato:", uploadError);
            return { success: false, error: "Error al subir PDF de formato" };
        }
        const { data: urlData } = supabase.storage
            .from("documentos_evaluacion")
            .getPublicUrl(uploadData.path);
        url_pdf_formato = urlData.publicUrl;
    }

    const { error } = await supabase.from("evaluacion_config").insert({
        nombre,
        url_pdf_bases,
        url_pdf_formato,
    });

    if (error) {
        console.error("Error creating evaluacion config:", error);
        return { success: false, error: "Error al crear configuración" };
    }

    return { success: true };
}

export async function deleteEvaluacionConfig(id: string) {
    const supabase = getSupabase();
    const { error } = await supabase.from("evaluacion_config").delete().eq("id", id);
    if (error) {
        console.error("Error deleting config:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

export async function vincularEvaluacionConfig(proyectoId: number, configId: string | null) {
    const supabase = getSupabase();
    const { error } = await supabase
        .from("proyectos_servicios")
        .update({ evaluacion_config_id: configId || null })
        .eq("id", proyectoId);

    if (error) {
        console.error("Error vinculando config:", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

// ──────────────────────── FILTROS DINÁMICOS ────────────────────────

export async function getEtapas() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("etapas")
        .select("id, descripcion")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching etapas:", error);
        return [];
    }

    return (data || []).map((item: any) => ({
        value: item.id,
        label: item.descripcion,
    }));
}

export async function getEjes() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("ejes")
        .select("id, descripcion")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching ejes:", error);
        return [];
    }

    return (data || []).map((item: any) => ({
        value: item.id,
        label: item.descripcion,
    }));
}

export async function getLineas() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("lineas")
        .select("id, descripcion")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching lineas:", error);
        return [];
    }

    return (data || []).map((item: any) => ({
        value: item.id,
        label: `L${item.id} - ${item.descripcion}`,
    }));
}

// ──────────────────────── PROYECTOS + EVALUACIÓN (CON FILTROS) ────────────────────────

export interface EvalFilters {
    etapa_id?: string;
    eje_id?: string;
    linea_id?: string;
    eval_estado?: string; // 'sin_evaluar' | 'Procesando' | 'Completado'
    search?: string;
}

export async function getProyectosConEvaluacion(filters?: EvalFilters) {
    const supabase = getSupabase();

    // Build query with joins
    let query = supabase
        .from("proyectos_servicios")
        .select(`
            id,
            nombre,
            codigo_proyecto,
            etapa_id,
            eje_id,
            linea_id,
            evaluacion_config_id,
            url_archivo_proyecto,
            etapas (id, descripcion),
            ejes (descripcion),
            lineas (descripcion),
            instituciones_ejecutoras (nombre)
        `)
        .order("id", { ascending: true });

    // Apply filters additively
    if (filters?.etapa_id && filters.etapa_id !== 'all') {
        query = query.eq("etapa_id", Number(filters.etapa_id));
    }
    if (filters?.eje_id && filters.eje_id !== 'all') {
        query = query.eq("eje_id", Number(filters.eje_id));
    }
    if (filters?.linea_id && filters.linea_id !== 'all') {
        query = query.eq("linea_id", Number(filters.linea_id));
    }
    if (filters?.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(`nombre.ilike.${term},codigo_proyecto.ilike.${term}`);
    }

    const { data: proyectos, error: projError } = await query;

    if (projError) {
        console.error("Error fetching proyectos:", projError);
        return [];
    }

    // Get latest evaluation result per project
    const { data: resultados, error: resError } = await supabase
        .from("evaluaciones_resultados")
        .select("proyecto_id, estado, puntaje_total, url_pdf_final, id")
        .order("fecha_evaluacion", { ascending: false });

    if (resError) {
        console.error("Error fetching resultados:", resError);
    }

    // Build a map: proyecto_id -> latest resultado
    const resultadoMap = new Map<number, any>();
    if (resultados) {
        for (const r of resultados) {
            if (!resultadoMap.has(r.proyecto_id)) {
                resultadoMap.set(r.proyecto_id, r);
            }
        }
    }

    let mapped = (proyectos || []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre || "Sin nombre",
        codigo: p.codigo_proyecto || "-",
        institucion: p.instituciones_ejecutoras?.nombre || "-",
        etapa: p.etapas?.descripcion || "-",
        eje: p.ejes?.descripcion || "-",
        linea: p.lineas?.descripcion || "-",
        evaluacion_config_id: p.evaluacion_config_id,
        url_archivo_proyecto: p.url_archivo_proyecto || null,
        eval_estado: resultadoMap.get(p.id)?.estado || null,
        eval_puntaje: resultadoMap.get(p.id)?.puntaje_total || null,
        eval_pdf_url: resultadoMap.get(p.id)?.url_pdf_final || null,
        eval_id: resultadoMap.get(p.id)?.id || null,
    }));

    // Filter by eval_estado client-side (since it comes from a separate table)
    if (filters?.eval_estado && filters.eval_estado !== 'all') {
        if (filters.eval_estado === 'sin_evaluar') {
            mapped = mapped.filter(p => !p.eval_estado);
        } else {
            mapped = mapped.filter(p => p.eval_estado === filters.eval_estado);
        }
    }

    return mapped;
}

// ──────────────────────── UPLOAD ARCHIVO PROYECTO ────────────────────────

export async function uploadArchivoProyecto(proyectoId: number, formData: FormData) {
    const supabase = getSupabase();
    const file = formData.get("archivo") as File | null;

    if (!file || file.size === 0) {
        return { success: false, error: "No se seleccionó ningún archivo." };
    }
    if (file.type !== "application/pdf") {
        return { success: false, error: "Solo se permiten archivos PDF." };
    }
    if (file.size > 15 * 1024 * 1024) {
        return { success: false, error: "El archivo excede el límite de 15 MB." };
    }

    const fileName = `proyecto_${proyectoId}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from("proyectos_postulantes")
        .upload(fileName, file, {
            contentType: "application/pdf",
            upsert: true,
        });

    if (uploadError) {
        console.error("Error uploading archivo proyecto:", uploadError);
        return { success: false, error: `Error al subir: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
        .from("proyectos_postulantes")
        .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Update the project row
    const { error: updateError } = await supabase
        .from("proyectos_servicios")
        .update({ url_archivo_proyecto: publicUrl })
        .eq("id", proyectoId);

    if (updateError) {
        console.error("Error updating url_archivo_proyecto:", updateError);
        return { success: false, error: "Archivo subido pero error al guardar URL." };
    }

    return { success: true, url: publicUrl };
}

// ──────────────────────── TRIGGER EVALUACIÓN ────────────────────────

export async function triggerEvaluacion(proyectoId: number) {
    const supabase = getSupabase();

    // Check if project has evaluacion_config_id assigned
    const { data: proyecto } = await supabase
        .from("proyectos_servicios")
        .select("evaluacion_config_id")
        .eq("id", proyectoId)
        .single();

    if (!proyecto?.evaluacion_config_id) {
        return {
            success: false,
            error: "Este proyecto no tiene una configuración de evaluación asignada. Asocie primero las Bases y el Formato desde la página de Configuración.",
        };
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    // Create/update resultado as "Procesando"
    const { data: existing } = await supabase
        .from("evaluaciones_resultados")
        .select("id")
        .eq("proyecto_id", proyectoId)
        .order("fecha_evaluacion", { ascending: false })
        .limit(1)
        .single();

    if (existing) {
        await supabase
            .from("evaluaciones_resultados")
            .update({ estado: "Procesando", fecha_evaluacion: new Date().toISOString() })
            .eq("id", existing.id);
    } else {
        await supabase.from("evaluaciones_resultados").insert({
            proyecto_id: proyectoId,
            estado: "Procesando",
        });
    }

    // Send webhook to n8n
    if (webhookUrl && !webhookUrl.includes("YOUR_N8N_INSTANCE")) {
        try {
            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ proyecto_id: proyectoId }),
            });
            console.log("Webhook response:", res.status);
        } catch (err) {
            console.error("Error calling n8n webhook:", err);
        }
    } else {
        console.log("N8N_WEBHOOK_URL not configured, skipping webhook. proyecto_id:", proyectoId);
    }

    return { success: true };
}

// ──────────────────────── RESULTADO DETALLE ────────────────────────

export async function getResultadoEvaluacion(proyectoId: number) {
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("evaluaciones_resultados")
        .select("*")
        .eq("proyecto_id", proyectoId)
        .order("fecha_evaluacion", { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching resultado:", error);
        return null;
    }

    return data;
}
