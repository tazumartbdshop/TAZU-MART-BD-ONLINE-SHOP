import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Image as ImageIcon, Plus, Layers, AlertCircle, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBannerStore, Banner } from '../../store/useBannerStore';
import { useProductStore } from '../../store/useProductStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import DeleteBannerConfirmationDialog from '../../components/common/DeleteBannerConfirmationDialog';

export default function BannerListing() {
  const { banners, sliderConfig } = useBannerStore();
  const { products } = useProductStore();
  const { categories, subscribe: subscribeCategories } = useCategoryStore();
  const navigate = useNavigate();

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bannerIdToDelete, setBannerIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filterType, setFilterType] = useState<'all' | 'main' | 'category' | 'login'>('all');

  // Helper checks
  const isLoginBanner = (b: Banner) => b.bannerType === 'login_banner' || b.bannerCategory === 'login_banner' || b.bannerCategory === 'login';
  const isCategoryBanner = (b: Banner) => !isLoginBanner(b) && (b.bannerType === 'category_banner' || b.bannerCategory === 'category_banner' || !!b.categoryId || !!b.connectedCategoryId);
  const isMainBanner = (b: Banner) => !isLoginBanner(b) && !isCategoryBanner(b);

  const mainBannersCount = banners.filter(isMainBanner).length;
  const categoryBannersCount = banners.filter(isCategoryBanner).length;
  const loginBannersCount = banners.filter(isLoginBanner).length;

  // Filtered banners list
  const filteredBanners = banners.filter(b => {
    if (filterType === 'main') return isMainBanner(b);
    if (filterType === 'category') return isCategoryBanner(b);
    if (filterType === 'login') return isLoginBanner(b);
    return true;
  });

  // Subscribe to real-time banner & category updates
  useEffect(() => {
    const unsubBanners = useBannerStore.getState().subscribe();
    const unsubCategories = subscribeCategories();
    return () => {
      unsubBanners();
      unsubCategories();
    };
  }, [subscribeCategories]);

  const handleEditClick = (banner: Banner) => {
    navigate(`/admin/banner/create?editId=${banner.id}`);
  };

  const handleDeleteClick = (bannerId: string) => {
    setBannerIdToDelete(bannerId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!bannerIdToDelete) return;
    setIsDeleting(true);
    try {
      await useBannerStore.getState().deleteBannerPermanently(bannerIdToDelete);
      toast.success("Banner সফলভাবে ডাটাবেজ থেকে মুছে ফেলা হয়েছে।");
      setIsDeleteModalOpen(false);
      setBannerIdToDelete(null);
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Failed to delete banner: ${err?.message || 'Unknown database error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setBannerIdToDelete(null);
  };

  // Drag-and-drop sequencing
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(dragIndex) && dragIndex !== dropIndex) {
      useBannerStore.getState().reorderBanners(dragIndex, dropIndex, filterType);
      toast.success("↔️ Banner sequence updated!");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div id="admin-banner-listing" className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 font-sans pb-24">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2 border-b border-zinc-100 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-black">Banner Listing</h1>
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <div className="w-1 h-3 bg-purple-600 rounded-full"></div> 
            Storefront Slide Orchestration
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/admin/banner/create')}
          className="bg-black text-white hover:bg-neutral-800 px-5 py-3 rounded-none text-xs uppercase tracking-widest font-black flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {/* Filter Tabs & Helpful Hint */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 border border-zinc-200 self-start flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            All Banners ({banners.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('main')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'main' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Main Banners ({mainBannersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('category')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'category' ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Category Banners ({categoryBannersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('login')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'login' ? 'bg-black text-white' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Login Banners ({loginBannersCount})
          </button>
        </div>

        {filteredBanners.length > 0 && (
          <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">
            💡 Drag & drop any card vertically to re-sequence.
          </p>
        )}
      </div>

      {/* Banner Cards List */}
      <div className="space-y-4">
        {filteredBanners.length > 0 ? (
          filteredBanners.map((banner, index) => {
            // Find linked product from productStore
            const linkedProduct = products.find(p => p.id === banner.connectedProductId);
            const targetCatId = banner.categoryId || banner.connectedCategoryId;
            const linkedCategory = categories.find(c => c.id === targetCatId);
            const isLogin = isLoginBanner(banner);
            const isCat = isCategoryBanner(banner);
            
            return (
              <div 
                key={banner.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={handleDragOver}
                className="bg-white rounded-none p-4 md:p-6 border border-zinc-200 hover:border-black transition-colors flex flex-col md:flex-row gap-6 items-start md:items-center justify-between cursor-grab active:cursor-grabbing group shadow-sm"
              >
                {/* Image and basic info container */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full min-w-0">
                  
                  {/* Left Side: Thumbnail Preview */}
                  <div className={`w-full sm:w-52 bg-zinc-50 border border-zinc-200 shrink-0 overflow-hidden relative flex items-center justify-center ${
                    isLogin ? 'aspect-[3/2]' : 'aspect-[1920/650]'
                  }`}>
                    {banner.image ? (
                      <img 
                        src={banner.image} 
                        alt={banner.name || 'Banner'} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-300">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[8px] font-black uppercase mt-1">No Image</span>
                      </div>
                    )}
                    {banner.originalWidth && banner.originalHeight && (
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[7px] font-mono text-zinc-200 px-1 py-0.5">
                        {banner.originalWidth}×{banner.originalHeight}
                      </span>
                    )}
                  </div>

                  {/* Right Side: Information block */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Header line: Position, Status & Type badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] font-black uppercase text-neutral-600 bg-zinc-100 px-2 py-0.5 border border-zinc-200">
                        Position #{index + 1}
                      </span>

                      {/* Status badge */}
                      <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-neutral-700">
                        <span className={`w-1.5 h-1.5 rounded-full ${banner.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-neutral-400'}`} />
                        <span>{banner.status === 'active' ? 'Active' : 'Inactive'}</span>
                      </div>
                      
                      {/* Banner Category Badge */}
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 border ${
                        isLogin
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : (isCat
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200')
                      }`}>
                        {isLogin ? 'LOGIN BANNER' : (isCat ? 'CATEGORY BANNER' : 'MAIN BANNER')}
                      </span>
                    </div>

                    {/* Banner name */}
                    <h3 className="font-extrabold text-black text-sm md:text-base tracking-tight leading-snug">
                      {banner.name || 'Untitled Banner'}
                    </h3>

                    {/* Linked Category or Product Info */}
                    <div className="text-xs text-neutral-500 pt-0.5 space-y-1">
                      {isCat && (linkedCategory || banner.categoryName) && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-black uppercase text-emerald-800">
                            Category: {linkedCategory?.name || banner.categoryName} {linkedCategory?.slug ? `(${linkedCategory.slug})` : ''}
                          </span>
                        </div>
                      )}

                      {linkedProduct ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-400 uppercase text-[8px] tracking-widest">Linked Product:</span>
                          {linkedProduct.image && (
                            <img 
                              src={linkedProduct.image} 
                              alt={linkedProduct.name} 
                              className="w-4 h-4 object-cover border border-zinc-200" 
                            />
                          )}
                          <span className="text-neutral-900 font-extrabold">{linkedProduct.name}</span>
                        </div>
                      ) : banner.buttonLink ? (
                        <span className="font-mono text-zinc-800 break-all bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded text-[10px] inline-block">
                          Target Route: {banner.buttonLink}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Edit and Delete */}
                <div className="flex items-center gap-2 w-full md:w-auto border-t border-zinc-100 md:border-t-0 pt-3 md:pt-0 shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => handleEditClick(banner)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-black text-black bg-white hover:bg-black hover:text-white transition-colors rounded-none select-none cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(banner.id)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-colors rounded-none select-none cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-zinc-200 bg-white shadow-sm p-8">
            <div className="w-12 h-12 bg-zinc-50 border border-zinc-200 flex items-center justify-center mb-4">
               <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-black font-extrabold text-sm uppercase tracking-wider">No Banners Found</p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Click "Add Banner" to create one.</p>
          </div>
        )}
      </div>

      <DeleteBannerConfirmationDialog
        isOpen={isDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

