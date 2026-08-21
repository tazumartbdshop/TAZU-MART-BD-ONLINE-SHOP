import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCategoryStore, CATEGORY_FALLBACKS } from '../store/useCategoryStore';
import { useProductStore } from '../store/useProductStore';
import { CompactProductCard } from '../components/product/CompactProductCard';
import CategoryBannerCarousel from '../components/home/CategoryBannerCarousel';
import { motion } from 'motion/react';
import { ChevronRight, ShoppingBag, ArrowLeft, ChevronDown } from 'lucide-react';
import { useSmartBack } from '../hooks/useSmartBack';
import { useDynamicSEO } from '../hooks/useDynamicSEO';

export default function CategoryPage() {
  const { id } = useParams();
  const goBack = useSmartBack('/categories');
  const { categories, isLoaded } = useCategoryStore();
  const { products } = useProductStore();

  let category = categories.find(c => 
    String(c.id).toLowerCase() === String(id).toLowerCase() || 
    String(c.slug).toLowerCase() === String(id).toLowerCase()
  );

  if (!category && id) {
    const normId = id.toLowerCase();
    const matchedFallback = CATEGORY_FALLBACKS.find(f => normId.includes(f.name) || f.name.includes(normId));
    if (matchedFallback) {
      category = {
        id: id,
        name: matchedFallback.name.toUpperCase(),
        bannerName: `${matchedFallback.name.toUpperCase()} COLLECTION`,
        slug: id,
        bannerImage: matchedFallback.image,
        displayOrder: 1,
        status: 'Active',
        showOnHomepage: true,
        createdAt: Date.now()
      };
    } else {
      category = {
        id: id,
        name: id.toUpperCase().replace(/-/g, ' '),
        bannerName: `${id.toUpperCase().replace(/-/g, ' ')} COLLECTION`,
        slug: id,
        bannerImage: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=200&h=200&auto=format&fit=crop",
        displayOrder: 1,
        status: 'Active',
        showOnHomepage: true,
        createdAt: Date.now()
      };
    }
  }
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex justify-center items-center">
        <div className="flex flex-col items-center gap-4 text-neutral-400">
           <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
           <p className="text-xs font-bold uppercase tracking-widest">Loading Collection...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-black text-gray-900 uppercase mb-2">Category Not Found</h2>
        <p className="text-gray-500 mb-6">The category you are looking for does not exist.</p>
        <Link to="/" className="bg-black text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-900 transition-all">
          Back to Home
        </Link>
      </div>
    );
  }

  const [visibleCount, setVisibleCount] = useState(16);

  const categoryProducts = products.filter(p => {
    const pCat = String(p.category || '').trim().toLowerCase();
    const cId = String(category.id || '').trim().toLowerCase();
    const cName = String(category.name || '').trim().toLowerCase();
    const cSlug = String(category.slug || '').trim().toLowerCase();
    return pCat === cId || pCat === cName || pCat === cSlug;
  });

  const displayedCategoryProducts = categoryProducts.slice(0, visibleCount);
  const hasMore = visibleCount < categoryProducts.length;

  const categoryJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category.name} Collection`,
    "description": `Shop authentic ${category.name} at best prices with nationwide delivery from TAZU MART BD.`,
    "url": `https://tazumartbd.com/category/${category.slug || category.id}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": categoryProducts.length,
      "itemListElement": categoryProducts.slice(0, 10).map((prod, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": prod.name,
        "url": `https://tazumartbd.com/product/${prod.slug || prod.id}`
      }))
    }
  };

  useDynamicSEO({
    title: `${category.name} Collection & Price in Bangladesh | TAZU MART BD`,
    description: `Discover genuine ${category.name} at TAZU MART BD. Premium quality, best market price, and cash on delivery across Bangladesh.`,
    canonicalUrl: `/category/${category.slug || category.id}`,
    ogImage: category.bannerImage,
    ogType: 'website',
    jsonLd: categoryJsonLd,
    keywords: [category.name, 'TAZU MART BD', `${category.name} Bangladesh`, 'Online Shopping BD']
  });

  return (
    <div className="bg-gray-50/50 min-h-screen pb-20">
      {/* 1. Breadcrumbs */}
      <div className="bg-white border-b border-gray-100 mb-6">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => goBack('/categories')}
              className="p-1 px-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all select-none"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              <Link to="/" className="hover:text-black transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-black">{category.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Banner (Full-Width Edge-to-Edge 1920:650) */}
      <section className="w-full mb-6 p-0 overflow-hidden">
        <CategoryBannerCarousel category={category} />
      </section>

      {/* 3. Category Info (Below Banner) */}
      <section className="px-4 mb-10">
        <div className="container mx-auto text-center md:text-left">
           <motion.div
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
           >
             <h1 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-2">
               {category.name}
             </h1>
             <p className="text-gray-500 text-sm md:text-lg font-medium tracking-tight max-w-2xl mx-auto md:mx-0">
               {category.bannerName}
             </p>
           </motion.div>
        </div>
      </section>

      {/* 4. Category Product Section */}
      <section className="px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">Collection</h2>
              <p className="text-xs text-gray-400 font-medium">Showing all {categoryProducts.length} items</p>
            </div>
            
            <div className="flex items-center gap-3">
              <select className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:border-black transition-colors appearance-none">
                <option>Newest First</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>

          {categoryProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                {displayedCategoryProducts.map((prod, idx) => (
                  <motion.div
                    key={prod.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 10) * 0.03 }}
                  >
                    <CompactProductCard product={prod} />
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 16)}
                    className="flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-md active:scale-95"
                  >
                    <span>Load More Items</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-[32px] border border-dashed border-gray-200 py-24 flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase mb-2 tracking-tight">No products found</h3>
              <p className="text-gray-400 max-w-sm mb-8 text-sm">We couldn't find any products in the {category.name} collection at the moment. Please check back later.</p>
              <Link 
                to="/shop" 
                className="bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-900 transition-all active:scale-95 shadow-xl shadow-black/10"
              >
                Explore Other Collections
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
