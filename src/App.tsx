import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase с твоими ключами
const SUPABASE_URL = 'https://sanixqycrowmzpvvesdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbml4cXljcm93bXpwdnZlc2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg5MTcsImV4cCI6MjA5NTAzNDkxN30.4dOt8DPrmJxD5k0OMxKnycU7I6936ZieuoU9UIWeVzM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Твои сохраненные ссылки на медиа-примеры
const EXAMPLES = {
  photo1: 'https://sanixqycrowmzpvvesdm.supabase.co/storage/v1/object/sign/model-media/profile-1.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81YzI2OWYwNS1kZjhhLTRjOTctYmIwOC02ZWUzYzQ5M2Q1ZGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtb2RlbC1tZWRpYS9wcm9maWxlLTEud2VicCIsImlhdCI6MTc3OTQ2NjYwOSwiZXhwIjoxODExMDAyNjA5fQ.tX8QoDlHEVaVq0yscZ45tIbxd8rAbR4WYSfZoCo3T3Q',
  photo2: 'https://sanixqycrowmzpvvesdm.supabase.co/storage/v1/object/sign/model-media/profile-2.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81YzI2OWYwNS1kZjhhLTRjOTctYmIwOC02ZWUzYzQ5M2Q1ZGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtb2RlbC1tZWRpYS9wcm9maWxlLTIud2VicCIsImlhdCI6MTc3OTQ2NjY1NywiZXhwIjoxODExMDAyNjU3fQ.oQzT-Os1EjwmUEyvjwfPF7iWEtWVwaNG8Gu_aZKGmAc',
  photo3: 'https://sanixqycrowmzpvvesdm.supabase.co/storage/v1/object/sign/model-media/profile-3.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81YzI2OWYwNS1kZjhhLTRjOTctYmIwOC02ZWUzYzQ5M2Q1ZGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtb2RlbC1tZWRpYS9wcm9maWxlLTMud2VicCIsImlhdCI6MTc3OTQ2NjgzMywiZXhwIjoxODExMDAyNjgzfQ.Vz248-8E0RvQ3JVaEqNJ7tWcUWYwT0sprzmlDwlTi1s',
  video: 'https://sanixqycrowmzpvvesdm.supabase.co/storage/v1/object/sign/model-media/profile-video.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81YzI2OWYwNS1kZjhhLTRjOTctYmIwOC02ZWUzYzQ5M2Q1ZGUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtb2RlbC1tZWRpYS9wcm9maWxlLXZpZGVvLm1wNCIsImlhdCI6MTc3OTQ2NjcwNCwiZXhwIjoxODExMDAyNzA0fQ.pTjEOA47M0Wi7pwc3V7rUFNChxDeG4x8iCa1hrqKKSY',
};

interface FormDataState {
  name: string;
  age: string;
  height: string;
  parameters: string;
  instagram: string;
  about: string;
}

interface FilesState {
  photo1: File | null;
  photo2: File | null;
  photo3: File | null;
  video: File | null;
}

export default function App() {
  const [tgUser, setTgUser] = useState<any>(null);
  const [formData, setFormData] = useState<FormDataState>({
    name: '', age: '', height: '', parameters: '', instagram: '', about: '',
  });
  const [files, setFiles] = useState<FilesState>({
    photo1: null, photo2: null, photo3: null, video: null,
  });
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTgUser(tg.initDataUnsafe?.user);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [e.target.name]: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка файлов на уровне JS (чтобы избежать "молчания" отправки)
    if (!files.photo1 || !files.photo2 || !files.photo3 || !files.video) {
      alert("Пожалуйста, загрузите все обязательные фото и видео материалы перед отправкой.");
      return;
    }

    setLoading(true);

    try {
      const uploadedUrls: { [key: string]: string } = {};

      // 1. Загрузка файлов в Bucket
      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${tgUser?.id || 'anon'}_${key}_${Date.now()}.${fileExt}`;
          
          console.log(`Загрузка файла: ${fileName}...`);
          
          const { error: uploadError } = await supabase.storage
            .from('model-media')
            .upload(fileName, file);

          if (uploadError) {
            throw new Error(`Ошибка загрузки медиа (${key}): ${uploadError.message}`);
          }
          
          uploadedUrls[key] = fileName;
        }
      }

      console.log("Медиа загружено успешно. Запись в базу данных...");

      // 2. Запись данных в таблицу (добавлено поле моделинга по умолчанию)
      const { error: dbError } = await supabase.from('models').insert([
        {
          telegram_id: tgUser?.id || null,
          name: formData.name,
          age: parseInt(formData.age),
          height: parseInt(formData.height),
          parameters: formData.parameters,
          instagram: formData.instagram,
          about: formData.about,
          photos: [uploadedUrls.photo1, uploadedUrls.photo2, uploadedUrls.photo3].filter(Boolean),
          video: uploadedUrls.video || null,
          models_types: "Моделинг" // Поле из ТЗ, предотвращает ошибку пустой строки
        },
      ]);

      if (dbError) {
        throw new Error(`Ошибка базы данных: ${dbError.message}. Код: ${dbError.code}`);
      }

      alert('Анкета успешно отправлена!');
      
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.sendData('anketa_sent');
        tg.close();
      }
    } catch (err: any) {
      console.error("Критическая ошибка:", err);
      alert('Произошла ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const UploadButton = ({ name, label, fileObject }: { name: keyof FilesState, label: string, fileObject: File | null }) => (
    <label style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: '24px 16px',
      backgroundColor: '#0a0a0a',
      border: fileObject ? '1px solid #ffffff' : '1px dashed #262626',
      borderRadius: '2px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'center'
    }}>
      <input 
        type="file" 
        name={name} 
        accept={name === 'video' ? 'video/*' : 'image/*'} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />
      {fileObject ? (
        <>
          <svg style={{ width: '24px', height: '24px', color: '#ffffff', marginBottom: '8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px' }}>Файл прикреплен</span>
          <span style={{ fontSize: '0.65rem', color: '#737373', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', whiteSpace: 'nowrap' }}>{fileObject.name}</span>
        </>
      ) : (
        <>
          <style>{`
            @keyframes pulse {
              0% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
              100% { transform: translateY(0); }
            }
            .upload-icon-${name} { animation: pulse 2s infinite ease-in-out; }
          `}</style>
          <svg className={`upload-icon-${name}`} style={{ width: '24px', height: '24px', color: '#a3a3a3', marginBottom: '8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
          <span style={{ fontSize: '0.65rem', color: '#525252', marginTop: '2px' }}>Нажмите для выбора файла</span>
        </>
      )}
    </label>
  );

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '24px 16px', backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: '-0.01em' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '4px', textTransform: 'uppercase', margin: '0 0 8px 0', color: '#ffffff' }}>CARTEL</h1>
        <p style={{ fontSize: '0.65rem', fontWeight: 400, letterSpacing: '2px', textTransform: 'uppercase', color: '#737373', margin: 0 }}>Application Form</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Полное Имя</label>
            <input type="text" name="name" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff', fontSize: '0.9rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Возраст</label>
              <input type="number" name="age" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Рост (см)</label>
              <input type="number" name="height" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff', fontSize: '0.9rem' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Параметры (грудь-талия-бёдра)</label>
            <input type="text" name="parameters" placeholder="90-60-90" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff', fontSize: '0.9rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Ссылка на Instagram</label>
            <input type="text" name="instagram" placeholder="@username или ссылка" onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff', fontSize: '0.9rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>О себе / Опыт работы</label>
            <textarea name="about" rows={3} onChange={handleInputChange} placeholder="Расскажите о себе..." style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff', fontSize: '0.9rem', resize: 'none' }}></textarea>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#171717', margin: '10px 0' }}></div>
        
        <div>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: '#ffffff', marginBottom: '24px', textAlign: 'center' }}>Медиаматериалы</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#e5e5e5' }}>1. Портрет анфас (без макияжа)</div>
              <img src={EXAMPLES.photo1} alt="Пример анфас" style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '1px', filter: 'grayscale(100%)', border: '1px solid #171717' }} />
              <UploadButton name="photo1" label="Загрузить Анфас" fileObject={files.photo1} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#e5e5e5' }}>2. Портрет в профиль (без макияжа)</div>
              <img src={EXAMPLES.photo2} alt="Пример профиль" style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '1px', filter: 'grayscale(100%)', border: '1px solid #171717' }} />
              <UploadButton name="photo2" label="Загрузить Профиль" fileObject={files.photo2} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#e5e5e5' }}>3. В полный рост (светлое белье)</div>
              <img src={EXAMPLES.photo3} alt="Пример полный рост" style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '1px', filter: 'grayscale(100%)', border: '1px solid #171717' }} />
              <UploadButton name="photo3" label="Загрузить Полный Рост" fileObject={files.photo3} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#e5e5e5' }}>4. Вертикальная видео-проходка (до 20 сек)</div>
              <video src={EXAMPLES.video} controls playsInline style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '1px', backgroundColor: '#0a0a0a', border: '1px solid #171717' }} />
              <UploadButton name="video" label="Загрузить Видео" fileObject={files.video} />
            </div>

          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            padding: '16px',
            borderRadius: '2px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '24px',
            transition: 'opacity 0.2s',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'Отправка данных...' : 'Отправить Заявку'}
        </button>
      </form>
    </div>
  );
}