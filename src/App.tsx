import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase
const SUPABASE_URL = 'https://sanixqycrowmzpvvesdm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbml4cXljcm93bXpwdnZlc2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTg5MTcsImV4cCI6MjA5NTAzNDkxN30.4dOt8DPrmJxD5k0OMxKnycU7I6936ZieuoU9UIWeVzM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Постоянные публичные ссылки на примеры медиа
const EXAMPLES = {
  photo1: `${SUPABASE_URL}/storage/v1/object/public/model-media/profile-1.webp`,
  photo2: `${SUPABASE_URL}/storage/v1/object/public/model-media/profile-2.webp`,
  photo3: `${SUPABASE_URL}/storage/v1/object/public/model-media/profile-3.webp`,
  video: `${SUPABASE_URL}/storage/v1/object/public/model-media/profile-video.mp4`,
};

type ModelType = 'IMAGE' | 'TRIP' | 'RELATIONSHIP';
type ViewMode = 'USER_FLOW' | 'ADMIN_LOGIN' | 'ADMIN_PANEL';

export default function App() {
  // Навигация
  const [viewMode, setViewMode] = useState<ViewMode>('USER_FLOW');
  const [step, setStep] = useState<'TYPE_SELECTION' | 'FORM' | 'SUCCESS'>('TYPE_SELECTION');
  const [selectedType, setSelectedType] = useState<ModelType | null>(null);
  
  // Данные пользователя и формы
  const [tgUser, setTgUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', age: '', height: '', parameters: '', instagram: '', about: '',
  });
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    photo1: null, photo2: null, photo3: null, video: null,
  });

  // Состояния для Админки
  const [adminPassword, setAdminPassword] = useState('');
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<ModelType>('IMAGE');
  const [selectedAdminModel, setSelectedAdminModel] = useState<any | null>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTgUser(tg.initDataUnsafe?.user);
    }
    
    if (window.location.hash === '#admin') {
      setViewMode('ADMIN_LOGIN');
    }
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setModelsList(data);
    } else {
      alert('Failed to fetch applications');
    }
    setLoading(false);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'cartel2026') {
      setViewMode('ADMIN_PANEL');
      fetchAdminData();
    } else {
      alert('Wrong password');
    }
  };

  const updateModelStatus = async (id: number, newStatus: 'ACCEPTED' | 'DECLINED') => {
    const { error } = await supabase
      .from('models')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      setModelsList(modelsList.map(m => m.id === id ? { ...m, status: newStatus } : m));
      if (selectedAdminModel && selectedAdminModel.id === id) {
        setSelectedAdminModel({ ...selectedAdminModel, status: newStatus });
      }
    }
  };

  const selectType = (type: ModelType) => {
    setSelectedType(type);
    setStep('FORM');
  };

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
    if (!files.photo1 || !files.photo2 || !files.photo3 || !files.video) {
      alert("Please upload all mandatory photos and video materials.");
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: { [key: string]: string } = {};

      for (const [key, file] of Object.entries(files)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${tgUser?.id || 'anon'}_${key}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('model-media')
            .upload(fileName, file);

          if (uploadError) throw new Error(`Media upload failed (${key}): ${uploadError.message}`);
          uploadedUrls[key] = fileName;
        }
      }

      // Сохраняем имя пользователя телеграм, если оно доступно
      const tgUsername = tgUser?.username || null;

      const { error: dbError } = await supabase.from('models').insert([
        {
          telegram_id: tgUser?.id || null,
          telegram_username: tgUsername, // добавочное поле для точных ссылок
          name: formData.name,
          age: parseInt(formData.age),
          height: parseInt(formData.height),
          parameters: formData.parameters,
          instagram: formData.instagram,
          about: formData.about,
          photos: [uploadedUrls.photo1, uploadedUrls.photo2, uploadedUrls.photo3],
          video: uploadedUrls.video,
          model_type: selectedType,
          status: 'NEW'
        },
      ]);

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      setStep('SUCCESS');
      
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.sendData) {
        tg.sendData('application_sent');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- РЕНДЕР: ВХОД В АДМИНКУ ---
  if (viewMode === 'ADMIN_LOGIN') {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '24px', backgroundColor: '#0a0a0a', border: '1px solid #262626', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h2 style={{ letterSpacing: '4px', fontWeight: 300, marginBottom: '24px' }}>CARTEL MODELS ADMIN</h2>
        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            value={adminPassword} 
            onChange={(e) => setAdminPassword(e.target.value)} 
            style={{ width: '100%', padding: '12px', backgroundColor: '#000', border: '1px solid #262626', color: '#fff', textAlign: 'center' }}
          />
          <button type="submit" style={{ width: '100%', backgroundColor: '#fff', color: '#000', padding: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>LOGIN</button>
        </form>
      </div>
    );
  }

  // --- РЕНДЕР: АДАПТИВНАЯ ПАНЕЛЬ АДМИНИСТРАТОРА ---
  if (viewMode === 'ADMIN_PANEL') {
    const filteredModels = modelsList.filter(m => m.model_type === adminTab);

    return (
      <div style={{ padding: '16px', backgroundColor: '#000', color: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        
        {/* Инъекция стилей для отзывчивой сетки на мобильных телефонах */}
        <style>{`
          .admin-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; }
          .back-btn { display: none; }
          @media (max-width: 768px) {
            .admin-grid { grid-template-columns: 1fr; }
            .left-panel { display: ${selectedAdminModel ? 'none' : 'block'}; }
            .right-panel { display: ${selectedAdminModel ? 'block' : 'none'}; }
            .back-btn { display: inline-block; }
          }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #171717', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 300, letterSpacing: '3px', margin: 0 }}>CARTEL MODELS</h1>
            <p style={{ fontSize: '0.65rem', color: '#737373', margin: '2px 0 0 0' }}>Applications Management</p>
          </div>
          <button onClick={() => { setViewMode('USER_FLOW'); setStep('TYPE_SELECTION'); }} style={{ backgroundColor: '#171717', color: '#fff', border: 'none', padding: '8px 14px', fontSize: '0.75rem', cursor: 'pointer' }}>Exit</button>
        </div>

        {/* Категории табов */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {(['IMAGE', 'TRIP', 'RELATIONSHIP'] as ModelType[]).map(type => (
            <button key={type} onClick={() => { setAdminTab(type); setSelectedAdminModel(null); }} style={{ flex: 1, padding: '10px 4px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: adminTab === type ? '#fff' : '#0a0a0a', color: adminTab === type ? '#000' : '#a3a3a3', border: '1px solid #262626', cursor: 'pointer' }}>
              {type} ({modelsList.filter(m => m.model_type === type).length})
            </button>
          ))}
        </div>

        <div className="admin-grid">
          {/* Левая сторона: Список */}
          <div className="left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '75vh', overflowY: 'auto' }}>
            {loading ? <p style={{ fontSize: '0.9rem', color: '#a3a3a3' }}>Loading...</p> : filteredModels.length === 0 ? <p style={{ color: '#525252', fontSize: '0.9rem' }}>No applications yet.</p> : 
              filteredModels.map(model => (
                <div key={model.id} onClick={() => setSelectedAdminModel(model)} style={{ padding: '14px', backgroundColor: '#0a0a0a', border: selectedAdminModel?.id === model.id ? '1px solid #fff' : '1px solid #262626', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{model.name}, {model.age}</div>
                    <div style={{ fontSize: '0.7rem', color: '#a3a3a3', marginTop: '2px' }}>H: {model.height}cm | {model.parameters}</div>
                  </div>
                  <span style={{ fontSize: '0.6rem', padding: '3px 6px', backgroundColor: model.status === 'NEW' ? '#262626' : model.status === 'ACCEPTED' ? '#166534' : '#991b1b', borderRadius: '1px' }}>{model.status}</span>
                </div>
              ))
            }
          </div>

          {/* Правая сторона: Карточка просмотра */}
          <div className="right-panel" style={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', padding: '20px', minHeight: '40vh' }}>
            {selectedAdminModel ? (
              <div>
                <button className="back-btn" onClick={() => setSelectedAdminModel(null)} style={{ backgroundColor: '#171717', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', marginBottom: '16px', cursor: 'pointer' }}>← Back to List</button>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', borderBottom: '1px solid #171717', paddingBottom: '12px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontWeight: 400, fontSize: '1.2rem' }}>{selectedAdminModel.name}</h2>
                    <p style={{ color: '#a3a3a3', margin: '2px 0 0 0', fontSize: '0.7rem' }}>Date: {new Date(selectedAdminModel.created_at).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => updateModelStatus(selectedAdminModel.id, 'ACCEPTED')} style={{ backgroundColor: '#166534', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => updateModelStatus(selectedAdminModel.id, 'DECLINED')} style={{ backgroundColor: '#991b1b', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Decline</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: '#737373', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Parameters</p>
                    <div style={{ fontSize: '0.85rem' }}>Age: {selectedAdminModel.age} | Height: {selectedAdminModel.height}cm</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>Specs: {selectedAdminModel.parameters}</div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', color: '#737373', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Contacts</p>
                    <div><a href={`https://instagram.com/${selectedAdminModel.instagram?.replace('@','')}`} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline', fontSize: '0.85rem' }}>Instagram: {selectedAdminModel.instagram}</a></div>
                    
                    {/* Кликабельная ссылка на профиль Telegram */}
                    <div style={{ marginTop: '4px' }}>
                      {selectedAdminModel.telegram_username ? (
                        <a href={`https://t.me/${selectedAdminModel.telegram_username}`} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline', fontSize: '0.85rem', fontWeight: 500 }}>
                          Open Telegram Chat
                        </a>
                      ) : selectedAdminModel.telegram_id ? (
                        <span style={{ fontSize: '0.85rem', color: '#a3a3a3' }}>TG ID: {selectedAdminModel.telegram_id}</span>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#525252' }}>No TG Link</span>
                      )}
                    </div>

                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.65rem', color: '#737373', margin: '0 0 4px 0', textTransform: 'uppercase' }}>About / Experience</p>
                  <p style={{ fontSize: '0.85rem', margin: 0, backgroundColor: '#000', padding: '10px', border: '1px solid #171717', whiteSpace: 'pre-wrap' }}>{selectedAdminModel.about || 'None.'}</p>
                </div>

                <div>
                  <p style={{ fontSize: '0.65rem', color: '#737373', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Media Materials</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    {selectedAdminModel.photos?.map((photoPath: string, index: number) => (
                      <a key={index} href={`${SUPABASE_URL}/storage/v1/object/public/model-media/${photoPath}`} target="_blank" rel="noreferrer">
                        <img src={`${SUPABASE_URL}/storage/v1/object/public/model-media/${photoPath}`} alt="Model Snap" style={{ width: '100%', height: '110px', objectFit: 'cover', border: '1px solid #262626' }} />
                      </a>
                    ))}
                  </div>
                  {selectedAdminModel.video && (
                    <video src={`${SUPABASE_URL}/storage/v1/object/public/model-media/${selectedAdminModel.video}`} controls style={{ width: '100%', maxHeight: '180px', backgroundColor: '#000', border: '1px solid #262626' }} />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#525252', fontSize: '0.85rem' }}>Select an application to view details</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- РЕНДЕР: ЭКРАН УСПЕШНОЙ ОТПРАВКИ ---
  if (step === 'SUCCESS') {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto', padding: '40px 16px', backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '-apple-system, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '1px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
          <svg style={{ width: '28px', height: '28px', color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 300, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '16px' }}>CARTEL MODELS</h1>
        <p style={{ fontSize: '0.85rem', color: '#e5e5e5', letterSpacing: '0.5px', lineHeight: '1.6', maxWidth: '320px', margin: '0 auto 40px auto' }}>
          Your application has been successfully submitted! The representatives of CARTEL MODELS will contact you shortly.
        </p>
        <button onClick={() => { setStep('TYPE_SELECTION'); setFormData({ name: '', age: '', height: '', parameters: '', instagram: '', about: '' }); setFiles({ photo1: null, photo2: null, photo3: null, video: null }); }} style={{ backgroundColor: '#ffffff', color: '#000000', padding: '14px 28px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
          Back to Main
        </button>
      </div>
    );
  }

  // --- РЕНДЕР: КЛИЕНТСКАЯ ФОРМА АНКЕТЫ ---
  if (step === 'TYPE_SELECTION') {
    return (
      <div style={{ maxWidth: '440px', margin: '0 auto', padding: '40px 16px', backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '-apple-system, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 300, letterSpacing: '5px', textTransform: 'uppercase', margin: '0 0 12px 0' }}>CARTEL MODELS</h1>
          <p style={{ fontSize: '0.7rem', fontWeight: 400, letterSpacing: '2px', textTransform: 'uppercase', color: '#737373', margin: 0 }}>Select Type of Cooperation</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(['IMAGE', 'TRIP', 'RELATIONSHIP'] as ModelType[]).map((type) => (
            <button key={type} onClick={() => selectType(type)} style={{ width: '100%', backgroundColor: '#0a0a0a', color: '#ffffff', border: '1px solid #262626', padding: '24px', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px' }}>
              {type}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '24px 16px', backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 300, letterSpacing: '4px', textTransform: 'uppercase', margin: '0 0 8px 0' }}>CARTEL MODELS</h1>
        <p style={{ fontSize: '0.65rem', fontWeight: 400, letterSpacing: '2px', textTransform: 'uppercase', color: '#737373', margin: 0 }}>Application Form — {selectedType}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Full Name</label>
          <input type="text" name="name" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Age</label>
            <input type="number" name="age" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Height (cm)</label>
            <input type="number" name="height" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Parameters (bust-waist-hips)</label>
          <input type="text" name="parameters" placeholder="90-60-90" required onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>Instagram Link</label>
          <input type="text" name="instagram" placeholder="@username" onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a3a3a3', marginBottom: '8px' }}>About Me / Experience</label>
          <textarea name="about" rows={3} onChange={handleInputChange} style={{ width: '100%', padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '2px', color: '#fff', resize: 'none' }}></textarea>
        </div>

        <div style={{ height: '1px', backgroundColor: '#171717', margin: '8px 0' }}></div>

        <div>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', textAlign: 'center' }}>Media Requirements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#e5e5e5' }}>1. Full-face portrait (no makeup)</span>
              <img src={EXAMPLES.photo1} alt="Example full-face" style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid #171717' }} />
              <label style={{ width: '100%', padding: '16px', backgroundColor: '#0a0a0a', border: files.photo1 ? '1px solid #fff' : '1px dashed #262626', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" name="photo1" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <span style={{ fontSize: '0.7rem', color: '#a3a3a3' }}>{files.photo1 ? files.photo1.name : 'UPLOAD PORTRAIT'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#e5e5e5' }}>2. Profile portrait (no makeup)</span>
              <img src={EXAMPLES.photo2} alt="Example profile" style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid #171717' }} />
              <label style={{ width: '100%', padding: '16px', backgroundColor: '#0a0a0a', border: files.photo2 ? '1px solid #fff' : '1px dashed #262626', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" name="photo2" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <span style={{ fontSize: '0.7rem', color: '#a3a3a3' }}>{files.photo2 ? files.photo2.name : 'UPLOAD PROFILE'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#e5e5e5' }}>3. Full body snapshot (light underwear)</span>
              <img src={EXAMPLES.photo3} alt="Example full body" style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid #171717' }} />
              <label style={{ width: '100%', padding: '16px', backgroundColor: '#0a0a0a', border: files.photo3 ? '1px solid #fff' : '1px dashed #262626', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" name="photo3" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <span style={{ fontSize: '0.7rem', color: '#a3a3a3' }}>{files.photo3 ? files.photo3.name : 'UPLOAD FULL BODY'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#e5e5e5' }}>4. Vertical walking video (up to 20 seconds)</span>
              <video src={EXAMPLES.video} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#0a0a0a', border: '1px solid #171717' }} />
              <label style={{ width: '100%', padding: '16px', backgroundColor: '#0a0a0a', border: files.video ? '1px solid #fff' : '1px dashed #262626', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                <input type="file" name="video" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <span style={{ fontSize: '0.7rem', color: '#a3a3a3' }}>{files.video ? files.video.name : 'UPLOAD VIDEO'}</span>
              </label>
            </div>

          </div>
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: '#fff', color: '#000', fontWeight: 600, padding: '16px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '16px' }}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}