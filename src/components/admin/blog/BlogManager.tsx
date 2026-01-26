// src/components/admin/blog/BlogManager.tsx
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Switch, Menu } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import type { BlogPost } from '@/types/index';
import { 
  Plus, Search, MoreVertical, Edit3, Trash2, Eye, 
  Image as ImageIcon, Loader2, Save, ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- UTILIDAD: Slugify ---
const slugify = (text: string) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Reemplazar espacios con -
    .replace(/[^\w\-]+/g, '')       // Eliminar caracteres no alfanuméricos
    .replace(/\-\-+/g, '-')         // Reemplazar múltiples - con uno solo
    .replace(/^-+/, '')             // Recortar - del inicio
    .replace(/-+$/, '');            // Recortar - del final
};

// ✅ CAMBIO 1: Eliminamos la prop 'currentUserId' de la definición
export default function BlogManager() {
  // ✅ CAMBIO 2: Creamos un estado interno para guardar el ID del usuario
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado del Editor
  const [editingPost, setEditingPost] = useState<Partial<BlogPost>>({
    title: '', slug: '', excerpt: '', content: '', published: false, image_url: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal Eliminar
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // --- CARGAR DATOS ---
  const fetchPosts = async () => {
    setLoading(true);
    
    // ✅ CAMBIO 3: Obtenemos el usuario aquí mismo
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setPosts(data as BlogPost[]);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  // --- HANDLERS ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de seguridad extra
    if (!currentUserId) {
        alert("Error de sesión: No se pudo identificar al usuario. Por favor recarga la página.");
        return;
    }

    if (!editingPost.title || !editingPost.slug || !editingPost.content) {
      alert('Por favor completa los campos obligatorios (*)');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        ...editingPost,
        author_id: currentUserId, // ✅ Ahora usa el estado interno
        updated_at: new Date().toISOString()
      };

      let error;
      if (editingPost.id) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id);
        error = updateError;
      } else {
        // Crear
        const { error: insertError } = await supabase
          .from('blog_posts')
          .insert([postData]);
        error = insertError;
      }

      if (error) throw error;
      
      await fetchPosts();
      setView('list');
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('blog_posts').delete().eq('id', deleteId);
    if (!error) {
      setPosts(posts.filter(p => p.id !== deleteId));
      setDeleteId(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploadingImage(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setEditingPost({ ...editingPost, image_url: publicUrl });
    } catch (error: any) {
      alert('Error subiendo imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // --- VISTA: EDITOR ---
  if (view === 'editor') {
    return (
      <div className="animate-fade-in space-y-6 max-w-5xl mx-auto">
        {/* Header Editor */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('list')} 
            className="flex items-center gap-2 text-secondary-500 hover:text-secondary-900 transition-colors font-medium"
          >
            <ArrowLeft size={20} /> Volver al listado
          </button>
          <h2 className="text-2xl font-display font-bold text-secondary-900">
            {editingPost.id ? 'Editar Artículo' : 'Nuevo Artículo'}
          </h2>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Contenido Principal */}
          <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm">
            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Título *</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 text-lg font-bold text-secondary-900 border border-secondary-200 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Ej: Tendencias de Coctelería 2026"
                value={editingPost.title}
                onChange={(e) => {
                  const val = e.target.value;
                  // Si estamos creando (no hay ID), autogeneramos el slug
                  if (!editingPost.id) {
                    setEditingPost({ ...editingPost, title: val, slug: slugify(val) });
                  } else {
                    setEditingPost({ ...editingPost, title: val });
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Slug (URL) *</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-600">
                <span className="text-secondary-400 text-sm">lareserva.com/blog/</span>
                <input 
                  type="text" 
                  required
                  className="bg-transparent w-full outline-none font-medium text-secondary-900 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500"
                  value={editingPost.slug}
                  onChange={(e) => setEditingPost({ ...editingPost, slug: slugify(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Resumen (SEO) *</label>
              <textarea 
                required
                rows={3}
                className="w-full px-4 py-3 border border-secondary-200 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                placeholder="Breve descripción que aparecerá en Google y en las tarjetas..."
                value={editingPost.excerpt}
                onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Contenido (HTML/Markdown) *</label>
              <textarea 
                required
                rows={15}
                className="w-full px-4 py-3 border border-secondary-200 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500 outline-none font-mono text-sm bg-secondary-50 whitespace-pre-wrap"
                placeholder="Escribe aquí el contenido de tu artículo..."
                value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
              />
              <p className="text-[10px] text-secondary-400 mt-2 text-right">Se acepta HTML básico y Markdown.</p>
            </div>
          </div>

          {/* Columna Derecha: Configuración y Medios */}
          <div className="space-y-6">
            {/* Tarjeta de Publicación */}
            <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-secondary-900">Estado</span>
                <Switch
                  checked={editingPost.published || false}
                  onChange={(val: boolean) => setEditingPost({ ...editingPost, published: val })}
                  className={`${editingPost.published ? 'bg-green-500' : 'bg-secondary-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                >
                  <span className={`${editingPost.published ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </Switch>
              </div>
              <div className="text-sm text-secondary-500">
                {editingPost.published ? 'El artículo es visible públicamente.' : 'El artículo está oculto (Borrador).'}
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/30 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                {editingPost.id ? 'Guardar Cambios' : 'Publicar Artículo'}
              </button>
            </div>

            {/* Imagen Destacada */}
            <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm space-y-4">
              <label className="block text-xs font-bold text-secondary-500 uppercase">Imagen de Portada</label>
              
              {editingPost.image_url ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-secondary-100 group">
                  <img src={editingPost.image_url} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={() => setEditingPost({ ...editingPost, image_url: '' })}
                      className="bg-red-500 text-white p-2 rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed border-secondary-200 flex flex-col items-center justify-center text-secondary-400 gap-2 hover:bg-secondary-50 transition-colors relative">
                  {uploadingImage ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <ImageIcon size={24} />
                      <span className="text-xs font-medium">Subir imagen</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  }

  // --- VISTA: LISTADO (Default) ---
  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar artículos..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-secondary-200 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => {
            setEditingPost({ title: '', slug: '', excerpt: '', content: '', published: false, image_url: '' });
            setView('editor');
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-secondary-900 text-white font-bold rounded-xl hover:bg-secondary-800 transition-all shadow-lg"
        >
          <Plus size={18} /> Crear Artículo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-secondary-200 shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-secondary-50 border-b border-secondary-200 text-xs uppercase font-bold text-secondary-500">
            <tr>
              <th className="px-6 py-4">Artículo</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">Vistas</th>
              <th className="px-6 py-4 text-right">Fecha</th>
              <th className="px-6 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary-500" /></td></tr>
            ) : filteredPosts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-secondary-400">No se encontraron artículos.</td></tr>
            ) : (
              filteredPosts.map(post => (
                <tr key={post.id} className="hover:bg-secondary-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-secondary-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary-100 flex items-center justify-center text-secondary-300"><ImageIcon size={20}/></div>
                      )}
                      <div>
                        <div className="font-bold text-secondary-900 line-clamp-1">{post.title}</div>
                        <div className="text-xs text-secondary-400 font-mono mt-0.5">/{post.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${post.published ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      <span className={`w-2 h-2 rounded-full ${post.published ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      {post.published ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-secondary-600">
                    {post.views || 0}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-secondary-500">
                    {format(new Date(post.created_at), 'dd MMM yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button className="p-2 hover:bg-secondary-100 rounded-lg transition-colors text-secondary-400 hover:text-secondary-900 outline-none">
                        <MoreVertical size={18} />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                          <div className="p-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button onClick={() => { setEditingPost(post); setView('editor'); }} className={`${active ? 'bg-primary-50 text-primary-900' : 'text-secondary-700'} group flex w-full items-center rounded-lg px-2 py-2 text-sm`}>
                                  <Edit3 className="mr-2 h-4 w-4" /> Editar
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <a href={`/blog/${post.slug}`} target="_blank" className={`${active ? 'bg-primary-50 text-primary-900' : 'text-secondary-700'} group flex w-full items-center rounded-lg px-2 py-2 text-sm`}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver Demo
                                </a>
                              )}
                            </Menu.Item>
                          </div>
                          <div className="p-1">
                            <Menu.Item>
                              {({ active }) => (
                                <button onClick={() => setDeleteId(post.id)} className={`${active ? 'bg-red-50 text-red-900' : 'text-red-600'} group flex w-full items-center rounded-lg px-2 py-2 text-sm`}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Confirmación Eliminar */}
      <Transition appear show={!!deleteId} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setDeleteId(null)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 mb-2">
                  ¿Eliminar artículo?
                </Dialog.Title>
                <p className="text-sm text-secondary-500 mb-6">
                  Esta acción no se puede deshacer. El artículo dejará de ser visible inmediatamente.
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-bold text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors">Cancelar</button>
                  <button onClick={handleDelete} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-200">Sí, eliminar</button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}