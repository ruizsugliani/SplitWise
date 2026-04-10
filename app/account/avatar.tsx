'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react' // Importamos iconos para mejor UX

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
}: {
  uid: string | null
  url: string | null
  size: number
  onUpload: (url: string) => void
}) {
  const supabase = createClient()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(url)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function downloadImage(path: string) {
      try {
        const { data, error } = await supabase.storage.from('avatars').download(path)
        if (error) {
          throw error
        }

        const url = URL.createObjectURL(data)
        setAvatarUrl(url)
      } catch (error) {
        console.log('Error downloading image: ', error)
      }
    }

    if (url) downloadImage(url)
  }, [url, supabase])

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      // filePath único para evitar colisiones
      const filePath = `${uid}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      onUpload(filePath)
    } catch (error) {
      alert('Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Contenedor de la Imagen */}
      <div className="relative group">
        {avatarUrl ? (
          <Image
            width={size}
            height={size}
            src={avatarUrl}
            alt="Avatar"
            className="rounded-3xl object-cover border-4 border-white/5 shadow-2xl transition-transform group-hover:scale-[1.02]"
            style={{ height: size, width: size }}
          />
        ) : (
          <div 
            className="bg-zinc-800 rounded-3xl flex items-center justify-center border-4 border-dashed border-white/10" 
            style={{ height: size, width: size }}
          >
            <Camera className="w-12 h-12 text-zinc-600" strokeWidth={1} />
          </div>
        )}
      </div>
      
      {/* Contenedor del Botón de Subida */}
      <div className="relative">
        <label 
          className={`
            cursor-pointer bg-white text-black text-xs font-bold py-2 px-4 rounded-full 
            hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2
            shadow-md shadow-black/30
            ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
          `} 
          htmlFor="single"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              Cambiar foto
            </>
          )}
        </label>
        <input
          className="hidden"
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </div>
    </div>
  )
}