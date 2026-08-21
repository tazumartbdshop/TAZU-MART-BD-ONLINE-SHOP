import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Upload, Image as ImageIcon, X, Trash2, ArrowRight, Camera, AlertCircle, Eye, Globe, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategoryStore, Category } from '../../store/useCategoryStore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { uploadImage } from '../../lib/imageUtils';
import UnsavedChangesDialog from '../../components/common/UnsavedChangesDialog';

// Helper to detect original width and height of an image file or URL
const getImageDimensions = (fileOrUrl: File | string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
};

export default function AddCategory() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { categories, addCategory, updateCategory } = useCategoryStore();
  const isEditing = !!id;

  // Unsaved changes state and logic
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    // Push dummy state to the history stack to capture browser/gesture back buttons
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      // Show the premium confirmation dialog
      setShowLeaveDialog(true);
      // Restore dummy state to keep the lock active
      window.history.pushState(null, '', window.location.href);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const handleConfirmLeave = () => {
    setIsDirty(false);
    setShowLeaveDialog(false);
    navigate(pendingNavigationPath || '/admin/category-listing', { replace: true });
  };

  const handleCancelLeave = () => {
    setShowLeaveDialog(false);
    setPendingNavigationPath(null);
  };


  const [activeTab, setActiveTab] = useState<'general' | 'seo'>('general');
  const [formData, setFormData] = useState({
    name: '',
    bannerName: '',
    slug: '',
    bannerImage: '',
    iconImage: '',
    wideBannerImage: '',
    buttonText: '',
    buttonLink: '',
    featuredProducts: '',
    description: '',
    displayOrder: 1,
    status: 'Active' as 'Active' | 'Inactive',
    showOnHomepage: true,
    metaTitle: '',
    metaDescription: '',
    keywords: ''
  });

  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [bannerFiles, setBannerFiles] = useState<(File | string)[]>([]);
  const [bannerDimensions, setBannerDimensions] = useState<{ width: number; height: number }[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [wideBannerFile, setWideBannerFile] = useState<File | null>(null);
  const [successDetails, setSuccessDetails] = useState<{
    id: string;
    name: string;
    imageUrl: string;
    bannerUrl: string;
  } | null>(null);
  const [sliderSettings, setSliderSettings] = useState({
    autoScroll: false,
    manualScroll: true,
    interval: 3
  });
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [wideBannerError, setWideBannerError] = useState<string | null>(null);
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [displayOrderError, setDisplayOrderError] = useState<string | null>(null);

  const bannerGalleryInputRef = useRef<HTMLInputElement>(null);
  const bannerCameraInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const wideBannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      const category = categories.find(c => c.id === id);
      if (category) {
        setFormData({
          name: category.name,
          bannerName: category.bannerName || '',
          slug: category.slug,
          bannerImage: category.bannerImage || '',
          iconImage: category.iconImage || '',
          wideBannerImage: category.wideBannerImage || '',
          buttonText: category.buttonText || '',
          buttonLink: category.buttonLink || '',
          featuredProducts: category.featuredProducts || '',
          description: category.description || '',
          displayOrder: category.displayOrder || 1,
          status: category.status,
          showOnHomepage: category.showOnHomepage !== undefined ? category.showOnHomepage : true,
          metaTitle: category.metaTitle || '',
          metaDescription: category.metaDescription || '',
          keywords: category.keywords || ''
        });
        const imgs = category.bannerImages && category.bannerImages.length > 0 ? category.bannerImages : (category.bannerImage ? [category.bannerImage] : []);
        setBannerImages(imgs);
        setBannerFiles(imgs);
        // Measure original dimensions of existing banners
        Promise.all(imgs.map(img => getImageDimensions(img))).then(dims => {
          setBannerDimensions(dims);
        });
        if (category.sliderSettings) {
           setSliderSettings(category.sliderSettings);
        }
      }
    }
  }, [id, isEditing, categories]);

  const handleSlugUpdate = (name: string) => {
    const slug = name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (name === 'displayOrder') {
      setDisplayOrderError(null);
    }
    if (name === 'name' && !isEditing) {
      handleSlugUpdate(value);
    }
  };

  const handleToggle = (name: 'status' | 'showOnHomepage') => {
    setIsDirty(true);
    if (name === 'status') {
      setFormData(prev => ({ ...prev, status: prev.status === 'Active' ? 'Inactive' : 'Active' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: !prev[name] }));
    }
  };

  const processBannerFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBannerError(null);
    setIsDirty(true);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml'];
    
    const newImgs: string[] = [];
    const newFiles: (File | string)[] = [];
    const newDims: { width: number; height: number }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type)) {
        setBannerError("Only JPG, PNG and WEBP formats are supported.");
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        setBannerError(`Banner image "${file.name}" exceeds 20MB limit.`);
        continue;
      }
      
      const tempUrl = URL.createObjectURL(file);
      const dims = await getImageDimensions(tempUrl);
      newImgs.push(tempUrl);
      newFiles.push(file);
      newDims.push(dims);
    }

    if (newImgs.length > 0) {
      setBannerImages(prev => [...prev, ...newImgs]);
      setBannerFiles(prev => [...prev, ...newFiles]);
      setBannerDimensions(prev => [...prev, ...newDims]);
      toast.success(`✅ Banner uploaded (${newDims[0].width} × ${newDims[0].height} px)`);
    }
  };

  const processThumbnailFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setThumbnailError(null);
    setIsDirty(true);
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setThumbnailError("Only JPG, PNG and WEBP formats are supported.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setThumbnailError(`Category icon exceeds 2MB limit.`);
      return;
    }
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, iconImage: url }));
    setThumbnailFile(file);
  };

  const processWideBannerFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setWideBannerError(null);
    setIsDirty(true);
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setWideBannerError("Only JPG, PNG and WEBP formats are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setWideBannerError(`Wide Banner image exceeds 5MB limit.`);
      return;
    }
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, wideBannerImage: url }));
    setWideBannerFile(file);
  };

  const removeWideBannerImage = () => {
    setIsDirty(true);
    if (formData.wideBannerImage && formData.wideBannerImage.startsWith('blob:')) {
      URL.revokeObjectURL(formData.wideBannerImage);
    }
    setFormData(prev => ({ ...prev, wideBannerImage: '' }));
    setWideBannerFile(null);
  };

  const removeBannerImage = (index: number) => {
    setIsDirty(true);
    const target = bannerImages[index];
    if (target && target.startsWith('blob:')) {
      URL.revokeObjectURL(target);
    }
    setBannerImages(prev => prev.filter((_, i) => i !== index));
    setBannerFiles(prev => prev.filter((_, i) => i !== index));
    setBannerDimensions(prev => prev.filter((_, i) => i !== index));
  };

  const removeThumbnailImage = () => {
    setIsDirty(true);
    if (formData.iconImage && formData.iconImage.startsWith('blob:')) {
      URL.revokeObjectURL(formData.iconImage);
    }
    setFormData(prev => ({ ...prev, iconImage: '' }));
    setThumbnailFile(null);
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    setSaveStatus('saving');
    setSaveError(null);
    setSavingStep('Initializing save sequence...');
    console.log("handleSubmit started: Uploading images...");

    try {
        // Upload thumbnail if changed
        let iconUrl = formData.iconImage;
        if (thumbnailFile) {
          setSavingStep('Uploading category icon (Thumbnail)...');
          console.log("Uploading thumbnail...");
          iconUrl = await uploadImage(thumbnailFile, 'categories', `icon-${formData.slug}`, 'categories');
          console.log("Thumbnail uploaded, URL:", iconUrl);
        }

        // Upload wide banner (16:9) if changed
        let wideBannerUrl = formData.wideBannerImage;
        if (wideBannerFile) {
          setSavingStep('Uploading wide banner image...');
          console.log("Uploading wide banner...");
          wideBannerUrl = await uploadImage(wideBannerFile, 'categories', `wide-banner-${formData.slug}`, 'categories');
          console.log("Wide banner uploaded, URL:", wideBannerUrl);
        }

        // Upload all new banners
        setSavingStep(`Uploading category gallery banners (${bannerFiles.length})...`);
        console.log("Uploading banners...");
        const finalBannerUrls = await Promise.all(
          bannerFiles.map(async (fileOrUrl, idx) => {
            if (typeof fileOrUrl === 'string') return fileOrUrl;
            setSavingStep(`Uploading gallery banner ${idx + 1}/${bannerFiles.length}...`);
            return await uploadImage(fileOrUrl, 'categories', `banner-${formData.slug}-${Math.random().toString(36).substring(7)}`, 'categories');
          })
        );
        console.log("Banners uploaded, URLs:", finalBannerUrls);

        const payload = {
          name: formData.name,
          slug: formData.slug || formData.name.toLowerCase().trim().replace(/\s+/g, '-'),
          bannerName: formData.bannerName || formData.name,
          bannerImage: finalBannerUrls[0] || '',
          bannerImages: finalBannerUrls,
          sliderSettings: sliderSettings,
          iconImage: iconUrl,
          wideBannerImage: wideBannerUrl,
          buttonText: formData.buttonText,
          buttonLink: formData.buttonLink,
          featuredProducts: formData.featuredProducts,
          description: formData.description,
          displayOrder: Number(formData.displayOrder) || 1,
          status: formData.status,
          showOnHomepage: formData.showOnHomepage,
          metaTitle: formData.metaTitle,
          metaDescription: formData.metaDescription,
          keywords: formData.keywords,
          imageUrl: iconUrl,
          image_url: iconUrl
        };

        setSavingStep('Writing data to Hostinger MySQL...');
        console.log("Uploading payload to database...");
        let dbResult: any;
        if (isEditing && id) {
          dbResult = await updateCategory(id, payload);
          console.log("Category updated in Database:", dbResult);
        } else {
          dbResult = await addCategory(payload);
          console.log("Category added to Database:", dbResult);
        }

        setSavingStep('Verifying saved data...');
        const savedId = dbResult?.id || id || `cat_${Date.now()}`;
        const savedName = dbResult?.name || formData.name;
        const savedImageUrl = dbResult?.image_url || dbResult?.icon_image || payload.iconImage;
        const savedBannerUrl = dbResult?.banner_image || payload.bannerImage;

        setSuccessDetails({
          id: savedId,
          name: savedName,
          imageUrl: savedImageUrl,
          bannerUrl: savedBannerUrl
        });
        
        setSaveStatus('saved');
        toast.success(isEditing ? "✅ Category Updated Successfully" : "✅ Category Created Successfully", {
          position: "top-center",
          style: {
            background: "#000",
            color: "#fff",
            fontWeight: "black",
            borderRadius: "0px",
            fontSize: "12px",
            letterSpacing: "0.1em"
          }
        });
        
        setIsDirty(false);
    } catch (error: any) {
        console.error("Save Category Error:", error);
        setSaveStatus('failed');
        setSaveError(error.message || String(error));
        toast.error(`❌ Save Failed: ${error.message || error}`);
    } finally {
        setSavingStep('');
        console.log("handleSubmit finished (finally block).");
    }
  };

  return (
    <div className="bg-white rounded-none border border-zinc-200 overflow-hidden mb-12">
      <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => {
              if (isDirty) {
                setPendingNavigationPath('/admin/category-listing');
                setShowLeaveDialog(true);
              } else {
                navigate('/admin/category-listing');
              }
            }} 
            className="p-2 border border-zinc-200 rounded-none bg-white hover:bg-gray-100 mr-1"
          >
            <ChevronLeft className="w-4 h-4 text-black" />
          </button>
          <h3 className="text-sm font-black text-black uppercase tracking-widest">
            {isEditing ? 'EDIT CATEGORY' : 'ADD CATEGORY'}
          </h3>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e)} className="grid grid-cols-1 lg:grid-cols-12">
        {/* Main form configuration */}
        <div className="lg:col-span-8 p-6 md:p-10 border-r border-zinc-200">
          
          {/* Sectionized tabs */}
          <div className="flex gap-4 border-b border-zinc-200 mb-8 pb-px">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'general' ? 'border-b-4 border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
              }`}
            >
              General Setup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seo')}
              className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'seo' ? 'border-b-4 border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
              }`}
            >
              SEO Configuration
            </button>
          </div>

          <div className="space-y-8">
            {activeTab === 'general' ? (
              <div className="space-y-8">
                {/* 1. Category name and slug */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-widest">Category Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="ENTER CATEGORY NAME..." 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-none focus:outline-none focus:border-black font-bold text-sm" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-black uppercase tracking-widest">Category Slug *</label>
                    <input 
                      type="text" 
                      name="slug" 
                      required
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="e.g. fashion-accessories" 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-none focus:outline-none focus:border-black font-bold font-mono text-sm" 
                    />
                  </div>
                </div>

                {/* 2. Banner name */}
                <span className="h-px bg-zinc-100 block" />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest">Featured Banner Accent Tagline</label>
                  <input 
                    type="text" 
                    name="bannerName" 
                    value={formData.bannerName}
                    onChange={handleInputChange}
                    placeholder="ENTER BANNER BANGLA OR ENGLISH PRIMARY HEADLINE..." 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-none focus:outline-none focus:border-black font-bold text-sm" 
                  />
                </div>

                {/* 3. Description text */}
                <span className="h-px bg-zinc-100 block" />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest">Context Summary Description</label>
                  <textarea 
                    name="description" 
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="ENTER SUMMARY TAGLINE TO BE SHOWN IN HEADER OVERLAYS..." 
                    className="w-full px-4 py-3 bg-zinc-50 border border-[#EEEEEE] border-zinc-200 rounded-none focus:outline-none focus:border-black font-medium text-sm resize-none" 
                  />
                </div>

                {/* 4. Upload Cover image */}
                <span className="h-px bg-zinc-100 block" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-black uppercase tracking-widest">Category Cover Image</h5>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight -mt-3">Tap to upload square thumbnail (displayed in search & browse)</p>
                    
                    {formData.iconImage ? (
                      <div className="relative w-28 h-28 bg-zinc-50 border border-zinc-200 p-2 flex items-center justify-center">
                        <img src={formData.iconImage} alt="Cover thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={removeThumbnailImage}
                          className="absolute -top-2 -right-2 bg-red-600 border border-zinc-200 text-white p-1 hover:bg-red-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="w-28 h-28 border-2 border-dashed border-zinc-200 hover:border-black bg-zinc-50 hover:bg-zinc-100/50 cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <Camera className="w-5 h-5 text-gray-400" />
                        <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Upload Cover</span>
                      </div>
                    )}
                    
                    <input 
                      type="file" 
                      ref={thumbnailInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => processThumbnailFile(e.target.files)}
                    />
                    {thumbnailError && (
                      <p className="text-[10px] text-red-600 font-bold">{thumbnailError}</p>
                    )}
                  </div>

                  {/* 5. Upload banners image */}
                  <div className="space-y-4 col-span-full">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                      <div>
                        <h5 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                          <span>Category Hero Banners</span>
                          <span className="bg-zinc-800 text-white text-[9px] px-2 py-0.5 font-mono font-bold">ORIGINAL RESOLUTION</span>
                        </h5>
                        <p className="text-[11px] text-gray-600 font-medium mt-1">
                          ইমেজটির Original Resolution এবং Original Aspect Ratio অপরিবর্তিত থাকবে। কোনো Forced Crop বা Stretch করা হবে না।
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                          Recommended Size: 1920 × 650 px
                        </div>
                        <div className="bg-zinc-100 border border-zinc-300 text-zinc-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                          Any Resolution Accepted
                        </div>
                      </div>
                    </div>

                    <div 
                      onClick={() => bannerGalleryInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-300 hover:border-black bg-zinc-50 hover:bg-zinc-100/80 p-6 text-center cursor-pointer min-h-[120px] flex flex-col items-center justify-center transition-colors group"
                    >
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-black mb-1.5 transition-colors" />
                      <span className="text-xs text-black font-black uppercase tracking-widest">TAP / CLICK TO UPLOAD CATEGORY BANNER</span>
                      <span className="text-[10px] text-zinc-500 font-medium mt-1">
                        Recommended: 1920 × 650 px (1920×650, 1612×638, 2000×700 বা যেকোনো Resolution সরাসরি গ্রহণ করবে)
                      </span>
                    </div>

                    {bannerImages.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-wider">
                          Active Category Banners ({bannerImages.length}) — Original Aspect Ratio:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bannerImages.map((bUrl, idx) => {
                            const dim = bannerDimensions[idx];
                            return (
                              <div 
                                key={idx} 
                                className="relative w-full border-2 border-zinc-200 bg-zinc-900 group overflow-hidden shadow-md"
                              >
                                <div className="w-full min-h-[140px] max-h-[260px] flex items-center justify-center bg-zinc-950 overflow-hidden">
                                  <img 
                                    src={bUrl} 
                                    alt={`Category Banner ${idx + 1}`} 
                                    className="w-full h-auto max-h-[260px] object-contain" 
                                    referrerPolicy="no-referrer" 
                                  />
                                </div>
                                
                                <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 pointer-events-none">
                                  <span className="bg-black/90 text-white border border-white/20 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest">
                                    BANNER #{idx + 1}
                                  </span>
                                  {dim && dim.width > 0 && (
                                    <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold px-2 py-0.5">
                                      Actual Size: {dim.width} × {dim.height} px
                                    </span>
                                  )}
                                </div>

                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                  <button
                                    type="button"
                                    onClick={() => removeBannerImage(idx)}
                                    className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase px-4 py-2 flex items-center gap-1.5 shadow transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Remove Banner
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <input 
                      type="file" 
                      ref={bannerGalleryInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple
                      onChange={(e) => processBannerFiles(e.target.files)} 
                    />
                    {bannerError && (
                      <p className="text-[10px] text-red-600 font-bold mt-2">{bannerError}</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest">Meta Title Title Tag</label>
                  <input 
                    type="text" 
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleInputChange}
                    placeholder="Enter meta title tag details..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-none focus:outline-none focus:border-black text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest">Search Keywords</label>
                  <input 
                    type="text" 
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleInputChange}
                    placeholder="e.g. cosmetics, original products, skin care"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-none focus:outline-none focus:border-black text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest">Meta Search Description</label>
                  <textarea 
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Brief description preview for SEO listings..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-none focus:outline-none focus:border-black text-xs font-bold resize-none"
                  />
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-200">
                  <h5 className="text-[8px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Search Engine Snippet Preview
                  </h5>
                  <div className="space-y-1 text-left">
                    <p className="text-sm font-bold text-blue-700 hover:underline cursor-pointer">
                      {formData.metaTitle || (formData.name ? `${formData.name} - Tazu Mart BD` : 'Page Title Preview')}
                    </p>
                    <p className="text-[10px] text-green-750 text-green-700">https://tazumartbd.com/category/{formData.slug || 'category-name'}</p>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1">
                      {formData.metaDescription || (formData.description || 'Provide a meta description overview details...')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Status / Position settings */}
        <div className="lg:col-span-4 p-6 md:p-8 bg-zinc-50/50 space-y-8 select-none">
          <div className="space-y-6">
            <h4 className="text-xs font-black text-black uppercase tracking-widest border-l-4 border-black pl-3">Status Settings</h4>
            
            <div className="p-4 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-[10px] font-black text-black uppercase tracking-widest">Tab Status</h5>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">Visible on listings</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('status')}
                  className={`px-4 py-1.5 text-[8px] font-black uppercase tracking-widest border transition-all ${
                    formData.status === 'Active' ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-200'
                  }`}
                >
                  {formData.status === 'Active' ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="h-px bg-zinc-100" />

              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-[10px] font-black text-black uppercase tracking-widest">Show in homepage</h5>
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">Home grids display</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('showOnHomepage')}
                  className={`px-4 py-1.5 text-[8px] font-black uppercase tracking-widest border transition-all ${
                    formData.showOnHomepage ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-200'
                  }`}
                >
                  {formData.showOnHomepage ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <h4 className="text-xs font-black text-black uppercase tracking-widest border-l-4 border-black pl-3 mt-6">Slider Settings</h4>

            <div className="p-4 border border-zinc-200 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black text-black uppercase tracking-widest">Auto Scroll</h5>
                <button
                  type="button"
                  onClick={() => {
                    setSliderSettings(p => ({...p, autoScroll: !p.autoScroll}));
                    setIsDirty(true);
                  }}
                  className={`px-4 py-1.5 text-[8px] font-black uppercase tracking-widest border ${sliderSettings.autoScroll ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-200'}`}
                >
                  {sliderSettings.autoScroll ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black text-black uppercase tracking-widest">Manual Scroll</h5>
                <button
                  type="button"
                  onClick={() => {
                    setSliderSettings(p => ({...p, manualScroll: !p.manualScroll}));
                    setIsDirty(true);
                  }}
                  className={`px-4 py-1.5 text-[8px] font-black uppercase tracking-widest border ${sliderSettings.manualScroll ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-200'}`}
                >
                  {sliderSettings.manualScroll ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-black uppercase tracking-widest">Auto Scroll Interval (Seconds)</label>
                <input 
                  type="number"
                  value={sliderSettings.interval}
                  onChange={(e) => {
                    setSliderSettings(p => ({...p, interval: Number(e.target.value)}));
                    setIsDirty(true);
                  }}
                  className="w-full px-4 py-2 bg-white border border-zinc-200 text-xs font-bold"
                />
              </div>
            </div>

            {/* Display sequence order number */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-black uppercase tracking-widest">Display Sequence Order Position *</label>
              <input 
                type="number" 
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-none focus:outline-none focus:border-black font-black text-xs text-black" 
                min="1"
              />
              {displayOrderError && (
                <p className="text-[10px] text-red-650 text-red-650 text-red-600 font-bold">{displayOrderError}</p>
              )}
            </div>

            {/* Save Buttons */}
            <div className="pt-8 space-y-4">
              <button
                type="submit"
                className={cn(
                  "w-full py-4 font-black uppercase text-xs tracking-widest text-center cursor-pointer transition-all border",
                  saveStatus === 'saving' ? "bg-zinc-800 text-white border-zinc-800 cursor-not-allowed" :
                  saveStatus === 'saved' ? "bg-emerald-600 text-white border-emerald-600" :
                  saveStatus === 'failed' ? "bg-red-600 text-white border-red-600" :
                  "bg-black hover:bg-zinc-900 border-black text-white"
                )}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'SAVING...' : 
                 saveStatus === 'saved' ? 'SAVED SUCCESSFULLY' :
                 saveStatus === 'failed' ? 'SAVE FAILED - TRY AGAIN' :
                 `[ ${isEditing ? 'UPDATE' : 'SAVE'} CATEGORY ]`}
              </button>

              <AnimatePresence>
                {saveStatus === 'saving' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-4 bg-zinc-100 border border-zinc-200"
                  >
                    <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin rounded-full shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-black">
                      {savingStep || 'Processing...'}
                    </span>
                  </motion.div>
                )}

                {saveStatus === 'failed' && saveError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-red-50 border border-red-200 text-red-600 flex items-start gap-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Operation Failed</p>
                      <p className="text-[10px] font-bold leading-relaxed">{saveError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </form>
      
      <UnsavedChangesDialog
        isOpen={showLeaveDialog}
        title="Unsaved Changes"
        message="আপনি এখনও ক্যাটাগরি তথ্য Save করেননি। আপনি কি নিশ্চিত এই পেজ থেকে বের হতে চান? আপনার করা পরিবর্তনগুলো হারিয়ে যাবে।"
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
        cancelText="Cancel"
        confirmText="Yes, Leave"
      />

      {successDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto">
          <div className="bg-white border border-black shadow-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-600 border-b border-zinc-100 pb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-wider text-black">
                {isEditing ? 'Category Updated Successfully' : 'Category Created Successfully'}
              </h3>
            </div>
            
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              The category has been successfully saved to the live database and is fully verified:
            </p>

            <div className="bg-zinc-50 border border-zinc-200 p-4 space-y-3 font-mono text-[10px] text-zinc-700 leading-relaxed overflow-x-auto">
              <div>
                <span className="font-bold text-black uppercase">Database ID:</span> {successDetails.id}
              </div>
              <div>
                <span className="font-bold text-black uppercase">Category Name:</span> {successDetails.name}
              </div>
              {successDetails.imageUrl && (
                <div className="break-all">
                  <span className="font-bold text-black uppercase">Image URL:</span>{' '}
                  <a href={successDetails.imageUrl} target="_blank" rel="noopener noreferrer" className="text-black underline break-all hover:text-zinc-600">
                    {successDetails.imageUrl}
                  </a>
                </div>
              )}
              {successDetails.bannerUrl && (
                <div className="break-all">
                  <span className="font-bold text-black uppercase">Banner URL:</span>{' '}
                  <a href={successDetails.bannerUrl} target="_blank" rel="noopener noreferrer" className="text-black underline break-all hover:text-zinc-600">
                    {successDetails.bannerUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Display simple preview grids inside the modal */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {successDetails.imageUrl && (
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Thumbnail Image</span>
                  <div className="aspect-square bg-zinc-50 border border-zinc-200 flex items-center justify-center overflow-hidden">
                    <img src={successDetails.imageUrl} alt="Thumbnail preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
              {successDetails.bannerUrl && (
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Banner Image</span>
                  <div className="aspect-video bg-zinc-50 border border-zinc-200 flex items-center justify-center overflow-hidden">
                    <img src={successDetails.bannerUrl} alt="Banner preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuccessDetails(null);
                  navigate('/admin/category-listing');
                }}
                className="flex-1 bg-black hover:bg-zinc-900 border border-black text-white py-3 text-[10px] font-black uppercase tracking-widest text-center cursor-pointer transition-colors"
              >
                Go to Listing &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }
