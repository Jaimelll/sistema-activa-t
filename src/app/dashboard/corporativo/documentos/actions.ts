"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
        throw new Error("Supabase environment variables are missing.");
    }
    
    return createClient(url, key, {
        auth: {
            persistSession: false
        }
    });
}

const BUCKET_NAME = "documentos_gerenciales";

export async function getDocumentos(search?: string) {
    try {
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
            console.error("Error fetching documentos:", error.message);
            return [];
        }
        return data || [];
    } catch (err: any) {
        console.error("Critical error in getDocumentos:", err.message);
        return [];
    }
}

export async function createDocumento(formData: FormData) {
    try {
        const supabase = getSupabase();
        const fecha_documento = formData.get("fecha_documento") as string;
        const nombre_archivo = formData.get("nombre_archivo") as string;
        const observaciones = formData.get("observaciones") as string;
        const file = formData.get("archivo") as File | null;

        if (!file || file.size === 0) {
            return { success: false, error: "Debe subir un archivo PDF." };
        }

        // Limit size to 15MB
        if (file.size > 15 * 1024 * 1024) {
            return { success: false, error: "El archivo excede el límite de 15 MB." };
        }

        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file, { 
                contentType: "application/pdf", 
                upsert: true,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            const msg = uploadError.message.includes("fetch") ? "Error de conexión con el Storage" : uploadError.message;
            return { success: false, error: `Error Storage: ${msg}` };
        }

        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(uploadData.path);

        const { error: dbError } = await supabase.from("documentos_gerenciales").insert({
            fecha_documento, // Input is YYYY-MM-DD string
            nombre_archivo,
            url_pdf: urlData.publicUrl,
            observaciones,
        });

        if (dbError) {
            console.error("Database insert error:", dbError.message);
            await supabase.storage.from(BUCKET_NAME).remove([uploadData.path]);
            return { success: false, error: `Error DB: ${dbError.message}` };
        }

        revalidatePath("/dashboard/corporativo/documentos");
        return { success: true };
    } catch (err: any) {
        console.error("Unexpected error in createDocumento:", err.message);
        return { success: false, error: "Error inesperado al procesar la solicitud." };
    }
}

export async function updateDocumento(id: string, formData: FormData) {
    try {
        const supabase = getSupabase();
        const fecha_documento = formData.get("fecha_documento") as string;
        const nombre_archivo = formData.get("nombre_archivo") as string;
        const observaciones = formData.get("observaciones") as string;
        const file = formData.get("archivo") as File | null;

        const { data: current, error: fetchError } = await supabase
            .from("documentos_gerenciales")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !current) {
            return { success: false, error: "No se encontró el documento en la base de datos." };
        }

        const updateData: any = {
            fecha_documento,
            nombre_archivo,
            observaciones,
            updated_at: new Date().toISOString(),
        };

        if (file && file.size > 0) {
            // Limit size to 15MB
            if (file.size > 15 * 1024 * 1024) {
                return { success: false, error: "El nuevo archivo excede los 15 MB." };
            }

            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, file, { 
                    contentType: "application/pdf", 
                    upsert: true,
                    cacheControl: '3600'
                });

            if (uploadError) {
                console.error("Storage update error:", uploadError);
                return { success: false, error: `Error Storage (update): ${uploadError.message}` };
            }

            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(uploadData.path);
            
            updateData.url_pdf = urlData.publicUrl;

            // Cleanup old file
            if (current.url_pdf) {
                const parts = current.url_pdf.split("/");
                const oldPath = parts[parts.length - 1];
                if (oldPath) {
                    await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
                }
            }
        }

        const { error: dbUpdateError } = await supabase
            .from("documentos_gerenciales")
            .update(updateData)
            .eq("id", id);

        if (dbUpdateError) {
            console.error("Database update error:", dbUpdateError.message);
            return { success: false, error: `Error DB (update): ${dbUpdateError.message}` };
        }

        revalidatePath("/dashboard/corporativo/documentos");
        return { success: true };
    } catch (err: any) {
        console.error("Unexpected error in updateDocumento:", err.message);
        return { success: false, error: "Fallo crítico en la actualización." };
    }
}

export async function deleteDocumento(id: string) {
    try {
        const supabase = getSupabase();

        const { data: current, error: fetchError } = await supabase
            .from("documentos_gerenciales")
            .select("url_pdf")
            .eq("id", id)
            .single();

        if (fetchError) {
            return { success: false, error: "Error al verificar existencia para eliminación." };
        }

        if (current?.url_pdf) {
            const parts = current.url_pdf.split("/");
            const filePath = parts[parts.length - 1];
            if (filePath) {
                const { error: storageDelError } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
                if (storageDelError) {
                    console.warn("Storage deletion warning:", storageDelError.message);
                }
            }
        }

        const { error: dbDelError } = await supabase.from("documentos_gerenciales").delete().eq("id", id);

        if (dbDelError) {
            return { success: false, error: `Error DB (delete): ${dbDelError.message}` };
        }

        revalidatePath("/dashboard/corporativo/documentos");
        return { success: true };
    } catch (err: any) {
        console.error("Unexpected error in deleteDocumento:", err.message);
        return { success: false, error: "Error al procesar la eliminación." };
    }
}
