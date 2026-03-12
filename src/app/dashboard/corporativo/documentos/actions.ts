"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

const BUCKET_NAME = "documentos_gerenciales";

export async function getDocumentos(search?: string) {
    const supabase = getSupabase();
    let query = supabase
        .from("documentos_gerenciales")
        .select("*")
        .order("fecha_documento", { ascending: false });

    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`nombre_archivo.ilike.${term},observaciones.ilike.${term}`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching documentos:", error);
        return [];
    }
    return data || [];
}

export async function createDocumento(formData: FormData) {
    const supabase = getSupabase();
    const fecha_documento = formData.get("fecha_documento") as string;
    const nombre_archivo = formData.get("nombre_archivo") as string;
    const observaciones = formData.get("observaciones") as string;
    const file = formData.get("archivo") as File | null;

    if (!file || file.size === 0) {
        return { success: false, error: "Debe subir un archivo PDF." };
    }

    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return { success: false, error: "Error al subir el archivo al Storage." };
    }

    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uploadData.path);

    const { error } = await supabase.from("documentos_gerenciales").insert({
        fecha_documento,
        nombre_archivo,
        url_pdf: urlData.publicUrl,
        observaciones,
    });

    if (error) {
        console.error("Error creating documento:", error);
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from(BUCKET_NAME).remove([uploadData.path]);
        return { success: false, error: "Error al guardar el registro en la base de datos." };
    }

    revalidatePath("/dashboard/corporativo/documentos");
    return { success: true };
}

export async function updateDocumento(id: string, formData: FormData) {
    const supabase = getSupabase();
    const fecha_documento = formData.get("fecha_documento") as string;
    const nombre_archivo = formData.get("nombre_archivo") as string;
    const observaciones = formData.get("observaciones") as string;
    const file = formData.get("archivo") as File | null;

    // Get current record for cleanup
    const { data: current, error: fetchError } = await supabase
        .from("documentos_gerenciales")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !current) {
        return { success: false, error: "No se encontró el documento." };
    }

    const updateData: any = {
        fecha_documento,
        nombre_archivo,
        observaciones,
        updated_at: new Date().toISOString(),
    };

    if (file && file.size > 0) {
        // Upload new file
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
            return { success: false, error: "Error al subir el nuevo archivo." };
        }

        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(uploadData.path);
        
        updateData.url_pdf = urlData.publicUrl;

        // Cleanup old file
        if (current.url_pdf) {
            const oldPath = current.url_pdf.split("/").pop();
            if (oldPath) {
                await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
            }
        }
    }

    const { error } = await supabase
        .from("documentos_gerenciales")
        .update(updateData)
        .eq("id", id);

    if (error) {
        console.error("Error updating documento:", error);
        return { success: false, error: "Error al actualizar el registro." };
    }

    revalidatePath("/dashboard/corporativo/documentos");
    return { success: true };
}

export async function deleteDocumento(id: string) {
    const supabase = getSupabase();

    // Get record for cleanup
    const { data: current } = await supabase
        .from("documentos_gerenciales")
        .select("url_pdf")
        .eq("id", id)
        .single();

    if (current?.url_pdf) {
        const filePath = current.url_pdf.split("/").pop();
        if (filePath) {
            await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
    }

    const { error } = await supabase.from("documentos_gerenciales").delete().eq("id", id);

    if (error) {
        console.error("Error deleting documento:", error);
        return { success: false, error: "Error al eliminar el registro." };
    }

    revalidatePath("/dashboard/corporativo/documentos");
    return { success: true };
}
