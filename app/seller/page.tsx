// @ts-nocheck
/* eslint-disable */
"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Package, Plus, UploadCloud, Search, 
  Loader2, X, ChevronLeft, Image as ImageIcon, CheckCircle2, 
  ToggleLeft, ToggleRight, Trash2, Edit2, ChevronRight,
  SlidersHorizontal, Copy, ClipboardList, User, MapPin, Truck, FileText, Save, Phone,Lock,
  Users, MessageCircle, ShoppingCart, TrendingUp, Calendar, Share2,
  Activity, UserPlus, ShoppingBag 
} from 'lucide-react';

const safeParseJSON = (data: any, fallback: any) => {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try { return JSON.parse(data); } catch (e) { return fallback; }
};

const getLocalTimestamp = () => new Date().toISOString();

const safeFormatDate = (d: string | null) => {
  if (!d) return "N/A";
  let dateString = d;
  if (!dateString.includes('Z') && !dateString.includes('+')) {
    dateString += 'Z';
  }
  const dt = new Date(dateString);
  return isNaN(dt.getTime()) 
    ? "N/A" 
    : dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

// 🌟 MAGIC FUNCTION: Forces ONLY Normal WhatsApp (Name fixed!)
const getWhatsAppLink = (phone: string, text: string = '') => {
  const encodedText = encodeURIComponent(text);
  let isAndroid = false;
  
  if (typeof window !== 'undefined') {
    isAndroid = /Android/i.test(navigator.userAgent);
  }

  if (isAndroid) {
    const fallbackUrl = encodeURIComponent(`https://wa.me/${phone}?text=${encodedText}`);
    return `intent://send?phone=${phone}&text=${encodedText}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${fallbackUrl};end`;
  }
  
  return `https://wa.me/${phone}?text=${encodedText}`;
};

export default function SellerDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'products' | 'upload' | 'orders' | 'order_detail' | 'users'>('dashboard');
  
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ── ORDERS STATE ──
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [editedQtys, setEditedQtys] = useState<Record<number, number>>({});
  const [trackingUrl, setTrackingUrl] = useState('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [expectedDispatch, setExpectedDispatch] = useState(''); 
  const [orderFilter, setOrderFilter] = useState('All'); // 🌟 NAYA: Order Filter State

  // ── USERS STATE ──
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Cart Bottom Sheet
  const [viewingUserCart, setViewingUserCart] = useState<any[] | null>(null);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  // Product Insights Bottom Sheet
  const [insightsSheetOpen, setInsightsSheetOpen] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [productsWithInsights, setProductsWithInsights] = useState<Set<number>>(new Set());
  // 🌟 NAYA: Product Filter State
  const [productFilter, setProductFilter] = useState('All');

  // Upload / Edit Form State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '', subcategory: '', mrp: '', cost: '', description: '', boxSize: '6'
  });
  const [uploadImages, setUploadImages] = useState<File[]>([]);
  const [uploadImagePreviews, setUploadImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [sizeConfig, setSizeConfig] = useState<Record<string, { extra_price: number, is_active: boolean }>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Variant Toggle Bottom Sheet State
  const [activeSheet, setActiveSheet] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingSizeConfig, setEditingSizeConfig] = useState<Record<string, { extra_price: number, is_active: boolean }>>({});
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);

  // Image Zoom Overlay State
  const [zoomOverlay, setZoomOverlay] = useState<{images: string[], currentIndex: number} | null>(null);

  // 🌟 NAYA: Dashboard Stats State
  const [dashStats, setDashStats] = useState({
    today: { active: 0, new: 0, buyers: 0, orders: 0, carts: 0 },
    week: { active: 0, new: 0, buyers: 0, orders: 0, carts: 0 }
  });

// 🌟 ACCURATE ANALYTICS FETCH FUNCTION (100% FIXED)
  const fetchDashboardStats = async () => {
    try {
      // 1. Timezone & Formatting Fix (Comparing in Milliseconds is safest)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today (Midnight)
      const startOfTodayMs = today.getTime();
      const startOfTodayISO = today.toISOString(); // For Supabase DB Query
      
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const startOfWeekMs = lastWeek.getTime();
      const startOfWeekISO = lastWeek.toISOString(); // For Supabase DB Query

      // 2. Fetch Data from Supabase
      const [{ data: oData }, { data: uData }, { data: cData }] = await Promise.all([
        supabase.from('orders').select('userid, createdAt').gte('createdAt', startOfWeekISO),
        supabase.from('users').select('created_at, meta'),
        supabase.from('cart_items').select('user_id, updated_at').gte('updated_at', startOfWeekISO)
      ]);

      // 3. Initialize Counters
      let tActive = 0, tNew = 0;
      let wActive = 0, wNew = 0;
      
      let tBuyers = new Set();
      let wBuyers = new Set();
      
      let tOrders = 0, wOrders = 0;
      
      let tCarts = new Set();
      let wCarts = new Set();

      // 4. Process Orders & Buyers
      (oData || []).forEach(o => {
        wOrders++;
        wBuyers.add(o.userid);
        
        // Convert DB time string to milliseconds
        const orderTime = new Date(o.createdAt).getTime();
        if (orderTime >= startOfTodayMs) {
          tOrders++;
          tBuyers.add(o.userid);
        }
      });

      // 5. Process Unique Cart Updates (Truck)
      (cData || []).forEach(c => {
        wCarts.add(c.user_id);
        
        // Convert DB time string to milliseconds
        const cartTime = new Date(c.updated_at).getTime();
        if (cartTime >= startOfTodayMs) {
          tCarts.add(c.user_id);
        }
      });

      // 6. Process Users (Active & New)
      (uData || []).forEach(u => {
        // --- A. NEW USERS LOGIC ---
        if (u.created_at) {
          const createdTime = new Date(u.created_at).getTime(); 
          if (createdTime >= startOfWeekMs) wNew++;
          if (createdTime >= startOfTodayMs) tNew++;
        }

        // --- B. ACTIVE USERS LOGIC ---
        let metaObj = {};
        try {
          metaObj = typeof u.meta === 'string' ? JSON.parse(u.meta) : (u.meta || {});
        } catch(e) {}

        if (metaObj.lastSeen) {
          const lastSeenTime = new Date(metaObj.lastSeen).getTime();
          if (lastSeenTime >= startOfWeekMs) wActive++;
          if (lastSeenTime >= startOfTodayMs) tActive++;
        }
      });

      // 7. Update the State
      setDashStats({
        today: { 
          active: tActive, 
          new: tNew, 
          buyers: tBuyers.size, 
          orders: tOrders, 
          carts: tCarts.size 
        },
        week: { 
          active: wActive, 
          new: wNew, 
          buyers: wBuyers.size, 
          orders: wOrders, 
          carts: wCarts.size 
        }
      });
      
    } catch(e) { 
      console.error("Stats Error:", e); 
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('nayika_naari_user'); 
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      router.replace('/');
    }
  }, [router]);

useEffect(() => {
    if (currentUser) {
      if (view === 'dashboard') { fetchMyProducts(); fetchOrders(); fetchDashboardStats(); }
      else if (view === 'orders') { fetchOrders(); }
      else if (view === 'products') { fetchMyProducts(); }
      else if (view === 'users') { fetchUsersData(); }
    }
  }, [currentUser, view]); // 🌟 'view' add karne se tab change par refresh hoga

  useEffect(() => {
    if (currentUser && view === 'users') {
      fetchUsersData();
    }
  }, [currentUser, view]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

const fetchMyProducts = async () => {
    setLoading(true);
    // Yahan hum default sorting ko hata rahe hain taaki hum manual sorting laga sakein
    const { data } = await supabase.from('products').select('*').eq('seller', currentUser?.name);
    
    if (data && data.length > 0) {
      const pIds = data.map((p: any) => p.id);
      
      // 🌟 NAYA: Yahan 'qty' bhi fetch kar rahe hain taaki total cart calculate ho sake
      const [ {data: cData}, {data: oData} ] = await Promise.all([
        supabase.from('cart_items').select('product_id, qty').in('product_id', pIds).eq('status', 0),
        supabase.from('order_details').select('productid').in('productid', pIds)
      ]);
      
      const activeIds = new Set<number>();
      const cartQtyMap = new Map<number, number>(); // Product_ID -> Total Qty in Cart

      cData?.forEach((c: any) => {
         activeIds.add(c.product_id);
         cartQtyMap.set(c.product_id, (cartQtyMap.get(c.product_id) || 0) + c.qty);
      });
      oData?.forEach((o: any) => activeIds.add(o.productid));
      
      setProductsWithInsights(activeIds);

      // 🌟 NAYA: Har product ke liye total boxes calculate karo aur object me add karo
      const enrichedData = data.map((p: any) => {
         const meta = safeParseJSON(p.meta, {});
         const boxSize = meta?.attributes?.box_size?.[0] || 6;
         const totalQty = cartQtyMap.get(p.id) || 0;
         const totalBoxes = Math.ceil(totalQty / boxSize);
         return { ...p, cartBoxes: totalBoxes };
      });

      // 🌟 NAYA: Sorting logic (Jiske cart me zyada boxes hain, wo top par aayega)
      enrichedData.sort((a: any, b: any) => {
         if (b.cartBoxes !== a.cartBoxes) {
            return b.cartBoxes - a.cartBoxes; // Sort High to Low
         }
         // Agar cart boxes same hain (ya 0 hain), toh naye products upar aayenge
         return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setMyProducts(enrichedData);
    } else {
      setMyProducts([]);
      setProductsWithInsights(new Set());
    }
    
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase.from('orders').select('*').order('createdAt', { ascending: false });
    
    if (ordersData && ordersData.length > 0) {
      const userIds = [...new Set(ordersData.map(o => o.userid).filter(Boolean))]; 
      let userMap = new Map();
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name').in('id', userIds);
        usersData?.forEach(u => {
          userMap.set(String(u.id), u.name);
          userMap.set(Number(u.id), u.name);
        });
      }

      const mappedOrders = ordersData.map(o => ({
        ...o,
        buyerName: userMap.get(o.userid) || userMap.get(String(o.userid)) || 'Unknown Buyer'
      }));
      setOrders(mappedOrders);
    } else {
      setOrders([]);
    }
    setLoading(false);
  };

  const fetchUsersData = async () => {
    setLoading(true);
    const [{ data: users }, { data: allOrders }, { data: cart }] = await Promise.all([
      supabase.from('users').select('*').order('id', { ascending: false }),
      supabase.from('orders').select('id, userid, createdAt'),
      supabase.from('cart_items').select('user_id, product_id, qty, size, updated_at, products(name, subcategory, img, meta, cost)').eq('status', 0)
    ]);

    if (users) {
      const enrichedUsers = users.map(u => {
        const uOrders = (allOrders || []).filter(o => o.userid === u.id);
        const uCart = (cart || []).filter(c => c.user_id === u.id);

        const lastOrder = uOrders.length > 0 ? uOrders.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b).createdAt : null;
        const lastCart = uCart.length > 0 ? uCart.reduce((a, b) => new Date(a.updated_at) > new Date(b.updated_at) ? a : b).updated_at : null;
        
        const uniqueProducts = new Set(uCart.map(c => c.product_id)).size;
        const totalPcs = uCart.reduce((acc, c) => acc + c.qty, 0);
        const totalBoxes = uCart.reduce((acc: number, c: any) => {
            const prodMeta = Array.isArray(c.products) ? c.products[0]?.meta : c.products?.meta;
            const boxSize = safeParseJSON(prodMeta, {})?.attributes?.box_size?.[0] || 6;
            return acc + Math.ceil(c.qty / boxSize);
        }, 0);

        const meta = safeParseJSON(u.meta, {});

        return {
          ...u,
          orderCount: uOrders.length,
          lastOrder,
          lastCart,
          cartUnique: uniqueProducts,
          cartPcs: totalPcs,
          cartBoxes: totalBoxes,
          lastSeen: meta.lastSeen || null,
          uCart
        };
      });

      enrichedUsers.sort((a, b) => {
        const getLatestTime = (user: any) => {
          const dates = [user.lastSeen, user.lastCart, user.lastOrder]
            .filter(Boolean) 
            .map(d => new Date(d).getTime()); 
          
          return dates.length > 0 ? Math.max(...dates) : 0;
        };

        return getLatestTime(b) - getLatestTime(a);
      });

      setUsersList(enrichedUsers);
    }
    setLoading(false);
  };

  const openInsights = async (product: any) => {
    setInsightsSheetOpen(true);
    setInsightsData({ product, cartSizes: {}, orderSizes: {}, uniqueCartUsers: 0, uniqueOrderUsers: 0, boxSize: 6 });
    setLoadingInsights(true);

    try {
      const meta = safeParseJSON(product.meta, {});
      const boxSize = meta?.attributes?.box_size?.[0] || 6;

      const [ {data: cartItems}, {data: ordItems} ] = await Promise.all([
        supabase.from('cart_items').select('size, qty, user_id').eq('product_id', product.id).eq('status', 0),
        supabase.from('order_details').select('size, qty, remainingQty, orderid').eq('productid', product.id)
      ]);

      const cartSizes: any = {};
      const cartUsers = new Set();
      (cartItems || []).forEach(c => {
         cartSizes[c.size] = (cartSizes[c.size] || 0) + c.qty;
         cartUsers.add(c.user_id);
      });

      const orderSizes: any = {};
      const orderIds = new Set();
      (ordItems || []).forEach(o => {
         const q = o.remainingQty !== null && o.remainingQty !== undefined ? o.remainingQty : o.qty;
         orderSizes[o.size] = (orderSizes[o.size] || 0) + q;
         orderIds.add(o.orderid);
      });

      let uniqueOrderUsers = 0;
      if (orderIds.size > 0) {
         const {data: oData} = await supabase.from('orders').select('userid').in('id', Array.from(orderIds));
         uniqueOrderUsers = new Set((oData || []).map(o => o.userid)).size;
      }

      setInsightsData({
         product,
         boxSize,
         cartSizes,
         orderSizes,
         uniqueCartUsers: cartUsers.size,
         uniqueOrderUsers
      });
    } catch(e) {
      console.error(e);
      showToast("Failed to load insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  const openOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setView('order_detail');
    setLoading(true);
    
    const orderMeta = safeParseJSON(order.meta, {});
    setExpectedDispatch(orderMeta.expectedDispatch || '');

    const { data: items } = await supabase.from('order_details').select('*').eq('orderid', order.id);
    if (items && items.length > 0) {
      const parsedItems = items.map(item => ({
        ...item,
        meta: safeParseJSON(item.meta, {})
      }));
      
      setOrderItems(parsedItems);
      const qtys: any = {};
      parsedItems.forEach((item: any) => {
        qtys[item.id] = item.remainingQty !== null && item.remainingQty !== undefined ? item.remainingQty : item.qty;
      });
      setEditedQtys(qtys);
    } else {
      setOrderItems([]);
    }
    
    setTrackingUrl(order.tracking || '');
    setBillFile(null); 
    setOrderStatus(order.status || 'Pending');
    setLoading(false);
  };

 // 🌟 UPDATED: Share Order Function (Exact same as Buyer App Format)
  const handleShareOrder = () => {
    if (!selectedOrder) return;
    
    // 1. Pehle items ki list taiyaar karte hain
    let itemDetailsStr = "";
    let calculatedTotal = 0;

    orderItems.forEach((item) => {
      const itemMeta = safeParseJSON(item.meta, {});
      const name = itemMeta.name || 'Product';
      const q = editedQtys[item.id] !== undefined ? editedQtys[item.id] : item.qty;
      const rate = item.rate || 0;
      const lineTotal = q * rate;
      calculatedTotal += lineTotal;

      itemDetailsStr += `- ${name} (${item.size}) x ${q} : ₹${lineTotal}\n`;
    });

    // Agar items list khali hai (old orders), toh amount default le lenge
    if (orderItems.length === 0) calculatedTotal = selectedOrder.amount;

    // 2. Wahi template jo Buyer App mein order place par banta hai
    let fullMsg = `New Order Placed!\n`;
    fullMsg += `Order ID: *#${selectedOrder.id}*\n\n`;
    fullMsg += `*Items:*\n${itemDetailsStr}\n`;
    fullMsg += `*Total Amount:* ₹${calculatedTotal}/-\n\n`;
    fullMsg += `*Buyer Details:*\n`;
    fullMsg += `Name: ${selectedOrder.buyerName}\n`;
    fullMsg += `Phone: ${selectedOrder.phone}\n`;
    fullMsg += `City: ${selectedOrder.city}\n\n`;
    fullMsg += `(Please check stock & confirm dispatch)`;

    // 3. Smart WhatsApp Link (Taaki sirf Normal WhatsApp khule)
    // Phone empty rakha hai taaki WhatsApp khulne par chat select karne ka option aaye
    window.location.href = getWhatsAppLink('', fullMsg);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      let uploadedBillUrl = selectedOrder.bill;

      if (billFile) {
        const fileExt = billFile.name.split('.').pop();
        const fileName = `bills/order_${selectedOrder.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, billFile);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        uploadedBillUrl = data.publicUrl;
      }

      let calculatedFinalAmount = 0;
      let isQtyChanged = false;

      if (orderItems.length > 0) {
        for (const item of orderItems) {
          const updatedQty = editedQtys[item.id];
          calculatedFinalAmount += updatedQty * item.rate;

          const currentQty = item.remainingQty !== null && item.remainingQty !== undefined ? item.remainingQty : item.qty;
          if (updatedQty !== currentQty) isQtyChanged = true;

          await supabase.from('order_details')
            .update({ remainingQty: updatedQty })
            .eq('id', item.id);
        }
      } else {
        calculatedFinalAmount = selectedOrder.amount;
      }

      const statusChanged = selectedOrder.status !== orderStatus; 

      const orderMeta = safeParseJSON(selectedOrder.meta, {});
      orderMeta.expectedDispatch = expectedDispatch;

      const { error: orderUpdateError } = await supabase.from('orders')
        .update({
          tracking: trackingUrl,
          bill: uploadedBillUrl,
          finalAmount: calculatedFinalAmount,
          status: orderStatus,
          meta: JSON.stringify(orderMeta)
        })
        .eq('id', selectedOrder.id);

      if (orderUpdateError) throw orderUpdateError;

      if (statusChanged || isQtyChanged) {
        const { data: buyer } = await supabase.from('users').select('push_token').eq('id', selectedOrder.userid).single();
        if (buyer?.push_token) {
            const myWebsiteUrl = window.location.origin;
            let title = "Order Updated 📦";
            let message = `Nayika Naari has updated your Order #${selectedOrder.id}. Please check the details.`;

            if (statusChanged && !isQtyChanged) {
                if (orderStatus === 'Dispatched') {
                    title = "Order Dispatched! 🚚";
                    message = `Great news! Your order #${selectedOrder.id} is on its way.`;
                } else if (orderStatus === 'Delivered') {
                    title = "Order Delivered! ✅";
                    message = `Your order #${selectedOrder.id} has been delivered successfully.`;
                } else if (orderStatus === 'Cancelled') {
                    title = "Order Cancelled ❌";
                    message = `Your order #${selectedOrder.id} has been cancelled.`;
                } else {
                    title = "Order Status Update 📦";
                    message = `Your order #${selectedOrder.id} status is now: ${orderStatus}.`;
                }
            } else if (isQtyChanged) {
                title = "Order Items Updated 📦";
                message = `Nayika Naari has updated quantities in your Order #${selectedOrder.id}. Please check the updated amount.`;
            }

            fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Basic os_v2_app_xhy5hwdypfhdvchoiklithssky66nrwfhrkeoqvmiba3ekrjy6l74os35hmocacgqak2372msqja2433uywmuhcfyesyiwozn2o522y'
              },
              body: JSON.stringify({ 
                app_id: "b9f1d3d8-7879-4e3a-88ee-4296899e5256",
                include_player_ids: [buyer.push_token], 
                headings: { en: title }, 
                contents: { en: message }, 
                url: `${myWebsiteUrl}/?view=order_detail&order_id=${selectedOrder.id}` 
              })
            }).catch(e => console.error("Push Error:", e));
        }
      }

      showToast("Order Updated Successfully!");
      fetchOrders(); 
      setView('orders');

    } catch (e: any) {
      alert("Error saving order: " + e.message);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCat = e.target.value;
    setUploadForm(prev => ({ ...prev, subcategory: selectedCat }));
    
    const category = categories.find(c => c.name === selectedCat);
    if (category) {
      const sizesArray = safeParseJSON(category.sizes, []);
      const initialSizeConfig: any = {};
      sizesArray.forEach((size: string) => { initialSizeConfig[size] = { extra_price: 0, is_active: true }; });
      setSizeConfig(initialSizeConfig);
    } else {
      setSizeConfig({});
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadImages(prev => [...prev, ...filesArray]);
      const previews = filesArray.map(f => URL.createObjectURL(f));
      setUploadImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeNewImage = (index: number) => { setUploadImages(prev => prev.filter((_, i) => i !== index)); setUploadImagePreviews(prev => prev.filter((_, i) => i !== index)); };
  const removeExistingImage = (index: number) => { setExistingImages(prev => prev.filter((_, i) => i !== index)); };

  const uploadImagesToSupabase = async (): Promise<string[]> => {
    const imageUrls: string[] = [];
    for (const file of uploadImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `product_images/${currentUser.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
      imageUrls.push(data.publicUrl);
    }
    return imageUrls;
  };

  const handleUploadProduct = async () => {
    if (!uploadForm.name || !uploadForm.subcategory || !uploadForm.mrp || !uploadForm.cost || (uploadImages.length === 0 && existingImages.length === 0)) {
      return alert("Please fill all required fields and add at least 1 image.");
    }
    setIsUploading(true);
    try {
      const uploadedUrls = await uploadImagesToSupabase();
      const finalImageUrls = [...existingImages, ...uploadedUrls];
      const imgJSON = JSON.stringify({ images: finalImageUrls });
      const metaJSON = JSON.stringify({ attributes: { available_colors: [], box_size: [parseInt(uploadForm.boxSize) || 6], available_sizes: sizeConfig } });
      const mrp = parseFloat(uploadForm.mrp);
      const cost = parseFloat(uploadForm.cost);
      const discount = Math.round(((mrp - cost) / mrp) * 100);

      const productData = { name: uploadForm.name, subcategory: uploadForm.subcategory, mrp: mrp, cost: cost, discount: discount > 0 ? discount : 0, description: uploadForm.description, status: 1, meta: metaJSON, img: imgJSON, seller: currentUser.name, ...(isEditMode ? {} : { createdAt: getLocalTimestamp() }) };

      let error;
      if (isEditMode && editingProductId) {
        const { error: updateError } = await supabase.from('products').update(productData).eq('id', editingProductId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('products').insert([productData]);
        error = insertError;
      }
      if (error) throw error;
      
      showToast(isEditMode ? "Product Updated Successfully!" : "Product Uploaded Successfully!");
      
      if (isEditMode) {
        setView('products');
        resetUploadForm();
      } else {
        resetUploadForm();
        window.scrollTo(0,0);
      }
      
      fetchMyProducts(); 
    } catch (error: any) { alert("Operation failed: " + error.message); } finally { setIsUploading(false); }
  };

  const resetUploadForm = () => { setIsEditMode(false); setEditingProductId(null); setUploadForm({ name: '', subcategory: '', mrp: '', cost: '', description: '', boxSize: '6' }); setUploadImages([]); setUploadImagePreviews([]); setExistingImages([]); setSizeConfig({}); };

  const startEditProduct = (product: any) => {
    const meta = safeParseJSON(product.meta, {}); const imgs = safeParseJSON(product.img, { images: [] });
    setIsEditMode(true); setEditingProductId(product.id);
    setUploadForm({ name: product.name, subcategory: product.subcategory, mrp: product.mrp.toString(), cost: product.cost.toString(), description: product.description || '', boxSize: meta?.attributes?.box_size?.[0]?.toString() || '6' });
    setExistingImages(imgs.images || []); setSizeConfig(meta?.attributes?.available_sizes || {}); setUploadImages([]); setUploadImagePreviews([]);
    setView('upload');
  };

  const startCopyProduct = (product: any) => {
    const meta = safeParseJSON(product.meta, {});
    setIsEditMode(false); setEditingProductId(null);
    setUploadForm({ name: '', subcategory: product.subcategory, mrp: '', cost: '', description: product.description || '', boxSize: meta?.attributes?.box_size?.[0]?.toString() || '6' });
    setSizeConfig(meta?.attributes?.available_sizes || {}); setExistingImages([]); setUploadImages([]); setUploadImagePreviews([]);
    setView('upload');
    showToast("Details copied. Enter Name & Pricing.");
  };

  const openVariantSheet = (product: any) => {
    setEditingProduct(product);
    const meta = safeParseJSON(product.meta, {});
    setEditingSizeConfig(meta?.attributes?.available_sizes || {});
    setActiveSheet(true);
  };

  const saveVariantStatus = async () => {
    setIsUpdatingVariant(true);
    try {
      const currentMeta = safeParseJSON(editingProduct.meta, {});
      currentMeta.attributes.available_sizes = editingSizeConfig;
      const { error } = await supabase.from('products').update({ meta: JSON.stringify(currentMeta) }).eq('id', editingProduct.id);
      if (error) throw error;
      showToast("Variants Updated!"); setActiveSheet(false); fetchMyProducts(); 
    } catch (e: any) { alert("Failed to update: " + e.message); } finally { setIsUpdatingVariant(false); }
  };

  const handleGlobalVariantToggle = () => {
    const sizeKeys = Object.keys(editingSizeConfig); if (sizeKeys.length === 0) return;
    const allActive = sizeKeys.every(size => editingSizeConfig[size].is_active !== false);
    const newConfig = { ...editingSizeConfig };
    sizeKeys.forEach(size => { newConfig[size] = { ...newConfig[size], is_active: !allActive }; });
    setEditingSizeConfig(newConfig);
  };

  // 🌟 NAYA: Filter Logic for Products (Search + Active/Inactive/Partial Status)
  const filteredProducts = myProducts.filter(p => {
    // 1. Search Check
    const matchesSearch = p?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p?.subcategory?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Status Check (Sizes ke base par)
    const metaData = safeParseJSON(p.meta, {});
    const sizesRaw = metaData?.attributes?.available_sizes || {};
    const sizeKeys = Object.keys(sizesRaw);
    
    let sizeStatus = 'Inactive'; // Default if no sizes
    if (sizeKeys.length > 0) {
      const activeCount = sizeKeys.filter(k => sizesRaw[k].is_active !== false).length;
      if (activeCount === sizeKeys.length) sizeStatus = 'Active';
      else if (activeCount === 0) sizeStatus = 'Inactive';
      else sizeStatus = 'Partial';
    }

    const matchesStatus = productFilter === 'All' || sizeStatus === productFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // 🌟 NAYA: Filter Logic for Orders (Search + Status Pill)
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o?.id?.toString().includes(searchQuery) || 
                          o?.buyerName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = orderFilter === 'All' || o?.status === orderFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = usersList.filter(u => u?.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || u?.phone?.toString().includes(userSearchQuery) || u?.city?.toLowerCase().includes(userSearchQuery.toLowerCase()));

  if (!currentUser) return null;

  return (
    <div className="w-full max-w-md mx-auto bg-[#F8F9FA] min-h-screen font-sans text-gray-900 shadow-2xl relative overflow-x-hidden flex flex-col pb-20 border-x border-gray-100">
      
      {zoomOverlay && (
        <div className="fixed inset-0 z-[6000] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm">
          <button onClick={() => setZoomOverlay(null)} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full z-20"><X size={24} /></button>
          {zoomOverlay.images.length > 1 && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest z-20">{zoomOverlay.currentIndex + 1} / {zoomOverlay.images.length}</div>
          )}
          <div className="relative w-full max-w-md flex items-center justify-center h-full">
            {zoomOverlay.currentIndex > 0 && ( <button onClick={() => setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex - 1} : null)} className="absolute left-4 p-3 bg-white/10 text-white rounded-full z-10 hover:bg-white/20 transition-colors"><ChevronLeft size={28}/></button> )}
            <img src={zoomOverlay.images[zoomOverlay.currentIndex]} className="w-full h-auto max-h-[85vh] object-contain transition-all duration-300" alt="Zoomed" />
            {zoomOverlay.currentIndex < zoomOverlay.images.length - 1 && ( <button onClick={() => setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex + 1} : null)} className="absolute right-4 p-3 bg-white/10 text-white rounded-full z-10 rotate-180 hover:bg-white/20 transition-colors"><ChevronLeft size={28}/></button> )}
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full z-[5000] text-xs font-bold tracking-widest shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-green-400" /> {toastMsg}
        </div>
      )}

      <header className="w-full px-4 py-3 bg-gray-900 text-white sticky top-0 z-40 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {view !== 'dashboard' && (
            <button onClick={() => {
              if (view === 'upload' && isEditMode) { resetUploadForm(); setView('products'); }
              else if (view === 'order_detail') setView('orders');
              else setView('dashboard');
            }} className="p-1 hover:bg-white/10 rounded-md transition-colors"><ChevronLeft size={22} /></button>
          )}
          <div>
            <h1 className="font-black text-lg italic tracking-tighter leading-tight">SELLER PANEL</h1>
            <p className="text-[10px] text-gray-400 font-medium">Welcome, {currentUser.name}</p>
          </div>
        </div>
        <button onClick={() => router.replace('/')} className="text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded border border-white/20 active:scale-95 flex items-center gap-1">BUYER VIEW <ChevronRight size={12}/></button>
      </header>

      <main className="flex-1 w-full overflow-y-auto scrollbar-hide">
        
        {view === 'dashboard' && (
          <div className="p-4 space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setView('products')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform">
                 <Package size={28} className="text-blue-500 mb-2" />
                 <h2 className="text-2xl font-black text-gray-900">{myProducts.length}</h2>
                 <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Live Products</p>
              </div>
              <div onClick={() => setView('orders')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-transform">
                 <ClipboardList size={28} className="text-green-500 mb-2" />
                 <h2 className="text-2xl font-black text-gray-900">{orders.length}</h2>
                 <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Orders</p>
              </div>
              
            </div>
            {/* 🌟 NAYA: Analytics Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  <h3 className="font-black text-xs text-gray-800 uppercase tracking-widest">Growth Metrics</h3>
                </div>
                <button onClick={fetchDashboardStats} className="text-[9px] font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 active:scale-95"><Activity size={12}/> REFRESH</button>
              </div>
              <div className="p-0">
                 <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-gray-50/30 text-[9px] text-gray-400 uppercase tracking-widest">
                        <th className="p-3 font-bold">Metric</th>
                        <th className="p-3 font-bold text-center border-l border-gray-100 bg-blue-50/30 text-blue-600">Today</th>
                        <th className="p-3 font-bold text-center border-l border-gray-100">7 Days</th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-gray-700">
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-[11px] flex items-center gap-2"><Activity size={14} className="text-green-500"/> Active Users</td>
                        <td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.active}</td>
                        <td className="p-3 text-center border-l border-gray-100">{dashStats.week.active}</td>
                      </tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-[11px] flex items-center gap-2"><UserPlus size={14} className="text-purple-500"/> New Users</td>
                        <td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.new}</td>
                        <td className="p-3 text-center border-l border-gray-100">{dashStats.week.new}</td>
                      </tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-[11px] flex items-center gap-2"><ShoppingBag size={14} className="text-orange-500"/> New Buyers</td>
                        <td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.buyers}</td>
                        <td className="p-3 text-center border-l border-gray-100">{dashStats.week.buyers}</td>
                      </tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-[11px] flex items-center gap-2"><ClipboardList size={14} className="text-blue-500"/> Orders Placed</td>
                        <td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.orders}</td>
                        <td className="p-3 text-center border-l border-gray-100">{dashStats.week.orders}</td>
                      </tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-[11px] flex items-center gap-2"><ShoppingCart size={14} className="text-pink-500"/> Truck Updated</td>
                        <td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.carts}</td>
                        <td className="p-3 text-center border-l border-gray-100">{dashStats.week.carts}</td>
                      </tr>
                    </tbody>
                 </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <button onClick={() => { resetUploadForm(); setView('upload'); }} className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 text-left">
                <div className="w-12 h-12 rounded-full bg-[#E5F7ED] text-[#008A00] flex items-center justify-center shrink-0"><Plus size={24} /></div>
                <div><h3 className="font-bold text-sm text-gray-900">Upload New Product</h3><p className="text-xs text-gray-500 mt-0.5">Add details, prices & images</p></div>
              </button>
            </div>
          </div>
        )}

        {/* ── 🌟 VIEW: USERS LISTING ── */}
        {view === 'users' && (
          <div className="animate-in fade-in duration-300 flex flex-col h-full bg-[#F8F9FA]">
            <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-3 sticky top-0 z-30 shadow-sm">
              {/* 🌟 NAYA: Users Count Badge */}
              <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 px-3 py-2 rounded-xl border border-blue-100 shrink-0 shadow-sm">
                 <span className="text-sm font-black leading-none">{filteredUsers.length}</span>
                 <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Users</span>
              </div>
              
              <div className="relative flex items-center flex-1">
                <div className="absolute left-3 text-gray-400"><Search size={16} /></div>
                <input type="text" placeholder="Search Users (Name, Phone)..." className="w-full bg-gray-100 text-sm font-semibold rounded-xl pl-10 pr-4 py-3 outline-none focus:bg-gray-50 border border-transparent focus:border-gray-300 transition-colors" value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="p-3 flex flex-col gap-3 pb-24">
              {loading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div> ) : filteredUsers.length === 0 ? ( <div className="text-center py-20 text-gray-400 font-medium text-sm bg-white rounded-2xl border border-gray-200 shadow-sm mx-1 flex flex-col items-center"><Users size={40} className="mb-2 opacity-20"/><p>No users found.</p></div> ) : (
                filteredUsers.map((u, index) => (
                  <div key={u.id || index} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm transition-transform">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center text-lg uppercase shrink-0">
                           {u.name ? u.name.charAt(0) : 'U'}
                        </div>
                        <div>
  <h3 className="font-black text-gray-900 text-[15px]">{u.name}</h3>
  
  <p className="text-[10px] font-bold text-gray-500 mt-0.5">
    <MapPin size={10} className="inline mr-0.5 mb-0.5"/> {u.city || 'N/A'}, {u.state || 'N/A'}
  </p>
  
  {/* 🌟 NAYA: Password Copy Block */}
  {u.password && (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(u.password);
        showToast("Password Copied! 🔐");
      }}
      className="flex items-center gap-2 mt-2 bg-red-50/60 px-2 py-1.5 rounded-md border border-red-100 cursor-pointer hover:bg-red-50 active:scale-[0.98] transition-all w-fit"
    >
      <Lock size={10} className="text-red-500" />
      <span className="text-[10px] font-bold text-gray-600">
        Pass: <span className="font-mono text-red-700">{u.password}</span>
      </span>
      <Copy size={12} className="text-red-400 ml-1" />
    </div>
  )}
</div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`tel:+91${u.phone}`} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center active:scale-95 transition-transform"><Phone size={14}/></a>
<a href={getWhatsAppLink(`91${u.phone}`)} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center active:scale-95 transition-transform"><MessageCircle size={14}/></a>                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-lg text-center mb-3">
                       <div onClick={() => { if(u.orderCount > 0) { setSearchQuery(u.name); setView('orders'); } }} className={`bg-white border border-gray-200 rounded py-2 shadow-sm ${u.orderCount > 0 ? 'cursor-pointer active:scale-95 hover:border-blue-300' : ''}`}>
                          <p className={`text-sm font-black ${u.orderCount > 0 ? 'text-blue-600' : 'text-gray-900'}`}>{u.orderCount}</p>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Orders</p>
                       </div>
                       
                       <div onClick={() => { if(u.uCart?.length > 0) { setViewingUserCart(u.uCart); setIsCartSheetOpen(true); } else showToast("Cart is empty"); }} className="bg-white border border-gray-200 rounded py-2 shadow-sm cursor-pointer active:scale-95 hover:border-blue-300">
                          <p className="text-sm font-black text-blue-600">{u.cartBoxes}B / {u.cartPcs}P</p>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Cart Qty</p>
                       </div>

                       <div className="bg-white border border-gray-200 rounded py-2 shadow-sm">
                          <p className="text-sm font-black text-gray-900">{u.cartUnique}</p>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Unique Items</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                       <div className="flex flex-col text-center">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Last Seen</span>
                          <span className="text-[10px] font-bold text-gray-700 leading-tight mt-0.5">{safeFormatDate(u.lastSeen)}</span>
                       </div>
                       <div className="flex flex-col text-center border-x border-gray-100">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Last Cart</span>
                          <span className="text-[10px] font-bold text-gray-700 leading-tight mt-0.5">{safeFormatDate(u.lastCart)}</span>
                       </div>
                       <div className="flex flex-col text-center">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Last Order</span>
                          <span className="text-[10px] font-bold text-gray-700 leading-tight mt-0.5">{safeFormatDate(u.lastOrder)}</span>
                       </div>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'upload' && (
          <div className="bg-white flex-1 animate-in slide-in-from-right duration-300">
            <div className="p-4 bg-gray-50 border-b border-gray-200 mb-4"><h2 className="font-black text-gray-800 uppercase tracking-wider text-sm flex items-center gap-2">{isEditMode ? <Edit2 size={16}/> : <UploadCloud size={16}/>} {isEditMode ? 'Edit Product' : 'Upload New Product'}</h2></div>
            <div className="px-4 space-y-5 pb-10">
              <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Product Name</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:border-gray-900 focus:bg-white outline-none transition-all" placeholder="e.g. Cotton Everyday Bra" value={uploadForm.name} onChange={e => setUploadForm({...uploadForm, name: e.target.value})} /></div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:border-gray-900 focus:bg-white outline-none transition-all appearance-none" value={uploadForm.subcategory} onChange={handleCategoryChange} disabled={isEditMode}>
                  <option value="" disabled>Select Category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                {isEditMode && <p className="text-[9px] text-gray-400 mt-1">Category cannot be changed while editing.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Cost Price (₹)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-black focus:border-gray-900 focus:bg-white outline-none transition-all" placeholder="0" value={uploadForm.cost} onChange={e => setUploadForm({...uploadForm, cost: e.target.value})} /></div>
                <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">MRP (₹)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 focus:border-gray-900 focus:bg-white outline-none transition-all" placeholder="0" value={uploadForm.mrp} onChange={e => setUploadForm({...uploadForm, mrp: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">MOQ Box Size (Pcs)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:border-gray-900 focus:bg-white outline-none transition-all" value={uploadForm.boxSize} onChange={e => setUploadForm({...uploadForm, boxSize: e.target.value})} /></div></div>
              
              {Object.keys(sizeConfig).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-3 block border-b border-gray-200 pb-2">Size Configuration & Extra Pricing</label>
                  <div className="space-y-3">
                    {Object.keys(sizeConfig).map((size) => {
                      const isActive = sizeConfig[size].is_active !== false; 
                      return (
                        <div key={size} className="flex items-center justify-between">
                          <div className="font-black text-gray-800 w-12">{size}</div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs font-bold text-gray-400">+ ₹</span>
                            <input type="number" placeholder="0" value={sizeConfig[size].extra_price === 0 ? '' : sizeConfig[size].extra_price} onChange={(e) => { const val = parseInt(e.target.value) || 0; setSizeConfig(prev => ({...prev, [size]: {...prev[size], extra_price: val}})); }} className="w-full max-w-[100px] bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-800" />
                          </div>
                          <button onClick={() => setSizeConfig(prev => ({...prev, [size]: {...prev[size], is_active: !isActive}}))} className="text-gray-500 transition-colors">
                            {isActive ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label><textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-gray-900 focus:bg-white outline-none transition-all h-24" placeholder="Enter details line by line..." value={uploadForm.description} onChange={e => setUploadForm({...uploadForm, description: e.target.value})} /></div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-1"><ImageIcon size={14}/> Product Images</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {existingImages.map((src, index) => ( <div key={`existing-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group bg-gray-50"><img src={src} className="w-full h-full object-cover cursor-zoom-in" alt="img" onClick={() => setZoomOverlay({images: existingImages, currentIndex: index})} /><button onClick={() => removeExistingImage(index)} className="absolute top-1 right-1 bg-white/90 p-1 rounded-md text-red-600 shadow-sm hover:bg-red-50"><Trash2 size={14}/></button></div> ))}
                  {uploadImagePreviews.map((src, index) => ( <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-200 group bg-blue-50"><img src={src} className="w-full h-full object-cover cursor-zoom-in" alt="preview" onClick={() => setZoomOverlay({images: uploadImagePreviews, currentIndex: index})} /><button onClick={() => removeNewImage(index)} className="absolute top-1 right-1 bg-white/90 p-1 rounded-md text-red-600 shadow-sm hover:bg-red-50"><Trash2 size={14}/></button></div> ))}
                  {(existingImages.length + uploadImagePreviews.length) < 5 && ( <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors bg-white"><Plus size={24} className="mb-1" /><span className="text-[10px] font-bold">Add Photo</span><input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} /></label> )}
                </div>
                <p className="text-[9px] text-gray-400">Add up to 5 images. Tap image to view.</p>
              </div>
              <button onClick={handleUploadProduct} disabled={isUploading} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${isUploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white active:scale-95'}`}>
                {isUploading ? <Loader2 className="animate-spin" size={18} /> : (isEditMode ? <CheckCircle2 size={18} /> : <UploadCloud size={18} />)}
                {isUploading ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Publish Product')}
              </button>
            </div>
          </div>
        )}

        {view === 'products' && (
          <div className="animate-in fade-in duration-300 flex flex-col h-full bg-[#F8F9FA]">
            <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-3 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3 w-full">
                {/* 🌟 Listings Count Badge */}
                <div className="flex flex-col items-center justify-center bg-purple-50 text-purple-700 px-3 py-2 rounded-xl border border-purple-200 shrink-0 shadow-sm">
                   <span className="text-sm font-black leading-none">{filteredProducts.length}</span>
                   <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Listings</span>
                </div>
                
                <div className="relative flex items-center flex-1">
                  <div className="absolute left-3 text-gray-400"><Search size={16} /></div>
                  <input type="text" placeholder="Search listings..." className="w-full bg-gray-100 text-sm font-semibold rounded-xl pl-10 pr-4 py-3 outline-none focus:bg-gray-50 border border-transparent focus:border-gray-300 transition-colors" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>

              {/* 🌟 Status Filters */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {['All', 'Active', 'Partial', 'Inactive'].map(status => (
                  <button 
                    key={status} 
                    onClick={() => setProductFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 transition-colors ${productFilter === status ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {status === 'Partial' ? 'Partial Active' : status}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 flex flex-col gap-3 pb-24">
              {loading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div> ) : filteredProducts.length === 0 ? ( <div className="text-center py-20 text-gray-400 font-medium text-sm bg-white rounded-2xl border border-gray-200 shadow-sm mx-1 flex flex-col items-center"><Package size={40} className="mb-2 opacity-20"/><p>No listings found.</p></div> ) : (
                filteredProducts.map(p => {
                  const imgData = safeParseJSON(p.img, { images: [] });
                  const metaData = safeParseJSON(p.meta, {});
                  const sizesRaw = metaData?.attributes?.available_sizes || {};
                  const sizeKeys = Object.keys(sizesRaw);
                  const activeSizesCount = sizeKeys.filter(k => sizesRaw[k].is_active !== false).length;

                  return (
                    <div key={p.id} className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex gap-3 relative overflow-hidden">
                      <div className="w-24 h-24 bg-gray-50 rounded-xl p-1 shrink-0 border border-gray-100 flex items-center justify-center cursor-zoom-in" onClick={() => setZoomOverlay({images: imgData.images, currentIndex: 0})}>
                        <img src={imgData.images[0] || ''} className="w-full h-full object-cover rounded-lg mix-blend-multiply" alt="" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1 overflow-hidden">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{p.name}</h3>
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 border border-gray-200">{p.subcategory}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1"><p className="font-black text-gray-900 text-base">₹{p.cost}</p><p className="text-[10px] text-gray-400 line-through font-bold">₹{p.mrp}</p></div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                          <button onClick={() => startEditProduct(p)} className="flex items-center gap-1 text-[10px] font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-md transition-colors"><Edit2 size={12} /> Edit</button>
                          <button onClick={() => startCopyProduct(p)} className="flex items-center gap-1 text-[10px] font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-2 py-1.5 rounded-md transition-colors"><Copy size={12} /> Copy</button>
                          <button onClick={() => openVariantSheet(p)} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-md transition-colors"><SlidersHorizontal size={12} /> Sizes: <span className={activeSizesCount === 0 ? "text-red-500" : ""}>{activeSizesCount}/{sizeKeys.length}</span></button>
                          
                          {productsWithInsights.has(p.id) && (
                            <button onClick={() => openInsights(p)} className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1.5 rounded-md transition-colors border border-purple-100">
                              <TrendingUp size={12} /> Insights
                            </button>
                          )}
                        </div>
                      </div>
                      {(p.status === 0 || p.status === false) && ( <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none"><span className="bg-red-500 text-white font-black text-[10px] px-3 py-1 rounded-full shadow-md tracking-widest uppercase">Disabled</span></div> )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── 🌟 VIEW 4: ORDERS LISTING ── */}
        {view === 'orders' && (
          <div className="animate-in fade-in duration-300 flex flex-col h-full bg-[#F8F9FA]">
            
            {/* 🌟 NAYA: Filter Pills & Search Section */}
            {/* 🌟 NAYA: Filter Pills & Search Section with Order Count */}
            <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-3 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3 w-full">
                {/* 🌟 NAYA: Orders Count Badge */}
                <div className="flex flex-col items-center justify-center bg-[#E5F7ED] text-[#008A00] px-3 py-2 rounded-xl border border-green-200 shrink-0 shadow-sm">
                   <span className="text-sm font-black leading-none">{filteredOrders.length}</span>
                   <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Orders</span>
                </div>
                
                <div className="relative flex items-center flex-1">
                  <div className="absolute left-3 text-gray-400"><Search size={16} /></div>
                  <input type="text" placeholder="Search orders (ID, Name, City)..." className="w-full bg-gray-100 text-sm font-semibold rounded-xl pl-10 pr-4 py-3 outline-none focus:bg-gray-50 border border-transparent focus:border-gray-300 transition-colors" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>

              {/* Status Filters */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {['All', 'Pending', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'].map(status => (
                  <button 
                    key={status} 
                    onClick={() => setOrderFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 transition-colors ${orderFilter === status ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 flex flex-col gap-3 pb-24">
              {loading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div> ) : filteredOrders.length === 0 ? ( <div className="text-center py-20 text-gray-400 font-medium text-sm bg-white rounded-2xl border border-gray-200 shadow-sm mx-1 flex flex-col items-center"><ClipboardList size={40} className="mb-2 opacity-20"/><p>No orders found.</p></div> ) : (
                filteredOrders.map((o, index) => {
                  const finalAmt = (o.finalAmount !== null && o.finalAmount !== undefined) ? o.finalAmount : o.amount;
                  return (
                    <div key={o.id || `order_${index}`} onClick={() => openOrderDetails(o)} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400">ORDER #{o.id || 'N/A'}</p>
                          <h3 className="font-black text-gray-900 text-sm truncate max-w-[180px]">{o.buyerName}</h3>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#008A00] text-base">₹{finalAmt}</p>
                          <p className="text-[9px] font-bold text-gray-400">{safeFormatDate(o.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center gap-1"><Package size={14}/> {o.box} Box</div>
                        <div className="flex items-center gap-1"><SlidersHorizontal size={14}/> {o.pcs} Pcs</div>
                        <div className="flex items-center gap-1"><MapPin size={14}/> {o.city}</div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 ${
                          o.status === 'Dispatched' ? 'bg-blue-50 text-blue-700' : 
                          o.status === 'Delivered' ? 'bg-[#E5F7ED] text-[#008A00]' : 
                          o.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {o.status}
                        </span>

                        {(o.status === 'Confirmed' && safeParseJSON(o.meta, {})?.expectedDispatch) && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center gap-1">
                            <Calendar size={10} /> 
                            Dispatch: {new Date(safeParseJSON(o.meta, {}).expectedDispatch).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}

                        <span className="text-[10px] font-bold text-blue-600 ml-auto shrink-0">View Details →</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── 🌟 VIEW 5: ORDER DETAIL PAGE ── */}
        {view === 'order_detail' && selectedOrder && (
          <div className="animate-in slide-in-from-right duration-300 flex flex-col min-h-full bg-[#F8F9FA] pb-24">
            
            <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="font-black text-gray-900 text-lg">{selectedOrder.buyerName}</h2>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">{safeFormatDate(selectedOrder.createdAt)}</p>
                </div>
                
                {/* 🌟 NAYA: Share Details CTA + Status Dropdown */}
                <div className="flex items-center gap-2">
                  <button onClick={handleShareOrder} className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-200 hover:bg-gray-100 flex items-center gap-1.5 active:scale-95 transition-transform">
                    <Share2 size={12} /> Share
                  </button>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md shrink-0 h-fit outline-none border cursor-pointer appearance-none text-center shadow-sm ${
                      orderStatus === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      orderStatus === 'Confirmed' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                      orderStatus === 'Dispatched' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      orderStatus === 'Delivered' ? 'bg-[#E5F7ED] text-[#008A00] border-green-200' :
                      orderStatus === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div 
              onClick={() => {
                  const copyText = `Name: ${selectedOrder.buyerName}\nPhone: ${selectedOrder.phone}\nAddress: ${selectedOrder.address}, ${selectedOrder.city}, ${selectedOrder.state} - ${selectedOrder.pincode}`;
                  navigator.clipboard.writeText(copyText);
                  showToast("Address Copied! ✅");
                }}
              className="text-xs font-semibold text-gray-600 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="flex items-center gap-2"><User size={14}/> {selectedOrder.buyerName}</p>
                <p className="flex items-center gap-2 mt-1.5"><MapPin size={14}/> {selectedOrder.address}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
                
                {/* 🌟 NAYA: WhatsApp aur Call CTA */}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                  <a href={`tel:+91${selectedOrder.phone}`} className="flex-1 flex justify-center items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-100 px-3 py-2 rounded-lg active:scale-95 transition-transform"><Phone size={14}/> Call Buyer</a>
<a href={getWhatsAppLink(`91${selectedOrder.phone}`)} target="_blank" rel="noreferrer" className="flex-1 flex justify-center items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-100 px-3 py-2 rounded-lg active:scale-95 transition-transform"><MessageCircle size={14}/> WhatsApp</a>                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2"><Package size={16}/> Ordered Items</h3>
              
              {loading ? ( <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div> ) : orderItems.length === 0 ? (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-xs font-bold border border-yellow-200 flex flex-col items-center text-center">
                  <p>Items not linked properly due to missing Order ID.</p>
                  <p className="text-[10px] mt-1 text-yellow-600 font-medium">Please check Database inserts (orderid is null).</p>
                </div>
              ) : (
                (() => {
                  const groupedItems = orderItems.reduce((acc, item) => {
                    const pId = item.productid;
                    if(!acc[pId]) acc[pId] = { name: item.meta?.name || 'Product', img: item.meta?.img || '', items: [] };
                    acc[pId].items.push(item);
                    return acc;
                  }, {});

                  return Object.entries(groupedItems).map(([pId, group]: any) => (
                    <div key={pId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-3 items-center">
                        <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 p-0.5 shrink-0" onClick={() => setZoomOverlay({images: [group.img], currentIndex: 0})}>
                          <img src={group.img} className="w-full h-full object-cover rounded-md" alt="" />
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 truncate">{group.name}</h4>
                      </div>
                      
                      <div className="p-3 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                          <span className="w-10">Size</span>
                          <span className="w-16 text-center">Orig Qty</span>
                          <span className="w-20 text-center">New Qty</span>
                          <span className="text-right w-16">Rate</span>
                        </div>
                        
                        {group.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-sm font-bold bg-white border border-gray-100 p-2 rounded-lg">
                            <span className="w-10 text-gray-900">{item.size}</span>
                            <span className="w-16 text-center text-gray-500">{item.qty}</span>
                            <div className="w-20 flex justify-center">
                              <input 
                                type="number" 
                                className="w-14 text-center bg-blue-50 border border-blue-200 text-blue-700 rounded-md py-1 outline-none focus:border-blue-400"
                                value={editedQtys[item.id] !== undefined ? editedQtys[item.id] : item.qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setEditedQtys(prev => ({...prev, [item.id]: val}));
                                }}
                              />
                            </div>
                            <span className="text-right w-16 text-gray-700">₹{item.rate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            <div className="p-4 space-y-4">
              <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2"><Truck size={16}/> Dispatch Details</h3>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Calendar size={12}/> Expected Dispatch Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full bg-blue-50 border border-blue-100 text-blue-800 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-300 outline-none" 
                    value={expectedDispatch} 
                    onChange={e => setExpectedDispatch(e.target.value)} 
                  />
                  <p className="text-[9px] text-gray-400 mt-1">This will be saved in order metadata.</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Tracking URL / Details</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-gray-900 outline-none" 
                    placeholder="Paste tracking link..." 
                    value={trackingUrl} 
                    onChange={e => {
                      setTrackingUrl(e.target.value);
                      if (e.target.value && orderStatus === 'Pending') setOrderStatus('Dispatched');
                    }} 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Upload Bill (PDF/Image)</label>
                  <div className="flex items-center gap-3">
                    <input type="file" id="bill-upload" className="hidden" accept="image/*,.pdf" onChange={e => setBillFile(e.target.files?.[0] || null)} />
                    <label htmlFor="bill-upload" className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-100 flex items-center gap-2 transition-colors">
                      <UploadCloud size={16} /> Choose File
                    </label>
                    <span className="text-xs font-medium text-gray-500 truncate max-w-[150px]">
                      {billFile ? billFile.name : (selectedOrder.bill ? 'Existing Bill Attached' : 'No file chosen')}
                    </span>
                  </div>
                  {selectedOrder.bill && !billFile && (
                    <a href={selectedOrder.bill} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold underline mt-2 inline-block">View Current Bill</a>
                  )}
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white p-3 border-t border-gray-200 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              {(() => {
                let currentCalc = 0;
                if (orderItems.length === 0) {
                  currentCalc = selectedOrder.amount || 0; 
                } else {
                  orderItems.forEach(item => {
                    const q = editedQtys[item.id] !== undefined ? editedQtys[item.id] : item.qty;
                    currentCalc += q * item.rate;
                  });
                }
                
                return (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col pl-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Final Amount</span>
                      <span className="text-lg font-black text-gray-900">₹{currentCalc}/-</span>
                      {currentCalc !== selectedOrder.amount && <span className="text-[9px] text-orange-500 font-bold">Orig: ₹{selectedOrder.amount}</span>}
                    </div>
                    <button 
                      onClick={handleSaveOrder} 
                      disabled={isSavingOrder}
                      className="flex-1 bg-[#FCE28A] text-black py-3.5 rounded-xl font-black active:scale-95 transition-all uppercase tracking-widest text-xs shadow-sm border border-[#EACD63] flex items-center justify-center gap-2"
                    >
                      {isSavingOrder ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      {isSavingOrder ? 'Saving...' : 'Save Updates'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* ── 🌟 BOTTOM SHEET: VARIANT TOGGLE ── */}
      {activeSheet && editingProduct && (() => {
        const imgData = safeParseJSON(editingProduct.img, { images: [] });
        const sizeKeys = Object.keys(editingSizeConfig);
        const allActive = sizeKeys.length > 0 && sizeKeys.every(size => editingSizeConfig[size].is_active !== false);

        return (
          <div className="fixed inset-0 z-[1000] flex justify-end flex-col">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setActiveSheet(false)}></div>
            <div className="bg-white w-full max-w-md mx-auto rounded-t-[2rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl flex flex-col max-h-[85vh]">
              
              <div className="p-4 border-b border-gray-100 shrink-0">
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="flex gap-4 items-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-xl p-1 shrink-0 border border-gray-100 flex items-center justify-center cursor-zoom-in" onClick={() => setZoomOverlay({images: imgData.images, currentIndex: 0})}>
                     <img src={imgData.images[0] || ''} className="w-full h-full object-cover rounded-lg mix-blend-multiply" alt="" />
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{editingProduct.name}</h4>
                      <p className="font-black text-gray-900 text-lg mt-0.5">₹{editingProduct.cost} <span className="text-xs font-medium text-gray-400 line-through">₹{editingProduct.mrp}</span></p>
                   </div>
                   <button onClick={() => setActiveSheet(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 hover:bg-gray-200"><X size={16}/></button>
                </div>
              </div>
              
              <div className="overflow-y-auto p-4 flex-1 bg-gray-50">
                <div className="flex justify-between items-center mb-3 px-1">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Manage Size Variants</h3>
                  {sizeKeys.length > 0 && (
                    <button onClick={handleGlobalVariantToggle} className="flex items-center gap-1.5 text-[10px] font-bold bg-white px-2 py-1 rounded border border-gray-200 shadow-sm active:scale-95">
                      {allActive ? <ToggleRight size={14} className="text-green-500"/> : <ToggleLeft size={14} className="text-gray-400"/>}
                      {allActive ? 'Disable All' : 'Enable All'}
                    </button>
                  )}
                </div>
                
                <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                  {sizeKeys.length === 0 && <p className="p-4 text-center text-gray-400 text-xs font-medium">No variants found.</p>}
                  {sizeKeys.map((size: string, index: number, arr) => {
                    const variant = editingSizeConfig[size];
                    const isActive = variant.is_active !== false; 
                    return (
                      <div key={size} className={`flex justify-between items-center py-3.5 px-4 ${index !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex items-center gap-3">
                           <p className={`font-black text-lg transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{size}</p>
                           {variant.extra_price > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border transition-colors ${isActive ? 'bg-[#FFF4E5] text-[#A65B00] border-[#FFE0B2]' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>+₹{variant.extra_price}</span>}
                        </div>
                        <button onClick={() => setEditingSizeConfig(prev => ({...prev, [size]: {...prev[size], is_active: !isActive}}))} className="active:scale-95 transition-transform">
                          {isActive ? <ToggleRight size={32} className="text-green-500 drop-shadow-sm" /> : <ToggleLeft size={32} className="text-gray-300" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 shrink-0 bg-white">
                 <button onClick={saveVariantStatus} disabled={isUpdatingVariant} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black active:scale-95 transition-all uppercase tracking-widest text-xs shadow-md flex items-center justify-center gap-2">
                   {isUpdatingVariant ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                   {isUpdatingVariant ? 'SAVING...' : 'SAVE CHANGES'}
                 </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 🌟 NEW BOTTOM SHEET: PRODUCT INSIGHTS ── */}
      {insightsSheetOpen && insightsData && (() => {
        const p = insightsData.product;
        const imgData = safeParseJSON(p.img, { images: [] });
        const metaData = safeParseJSON(p.meta, {});
        const allSizes = Object.keys(metaData?.attributes?.available_sizes || {});

        return (
          <div className="fixed inset-0 z-[1000] flex justify-end flex-col">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setInsightsSheetOpen(false)}></div>
            <div className="bg-gray-50 w-full max-w-md mx-auto rounded-t-[2rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl flex flex-col max-h-[85vh]">
              
              <div className="p-4 border-b border-gray-200 bg-white rounded-t-[2rem] shrink-0">
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="flex gap-4 items-center">
                   <div className="w-16 h-16 bg-gray-50 rounded-xl p-1 shrink-0 border border-gray-100 flex items-center justify-center">
                     <img src={imgData.images[0] || ''} className="w-full h-full object-cover rounded-lg mix-blend-multiply" alt="" />
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-0.5 flex items-center gap-1"><TrendingUp size={12}/> Demand Insights</p>
                      <h4 className="font-black text-gray-900 text-sm truncate">{p.name}</h4>
                   </div>
                   <button onClick={() => setInsightsSheetOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 hover:bg-gray-200"><X size={16}/></button>
                </div>
              </div>
              
              <div className="overflow-y-auto p-4 flex-1">
                {loadingInsights ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm text-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">In Cart (Buyers)</p>
                        <h2 className="text-2xl font-black text-blue-600">{insightsData.uniqueCartUsers}</h2>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm text-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ordered (Buyers)</p>
                        <h2 className="text-2xl font-black text-[#008A00]">{insightsData.uniqueOrderUsers}</h2>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                         <span className="w-16">Size</span>
                         <span className="flex-1 text-center text-blue-600">Cart (Boxes)</span>
                         <span className="flex-1 text-right text-[#008A00]">Order (Boxes)</span>
                      </div>
                      
                      {allSizes.length === 0 && <p className="p-4 text-center text-gray-400 text-xs font-medium">No sizes configured.</p>}
                      
                      {allSizes.map((size, index) => {
                        const cartPcs = insightsData.cartSizes[size] || 0;
                        const orderPcs = insightsData.orderSizes[size] || 0;
                        
                        const cartBoxes = Math.ceil(cartPcs / insightsData.boxSize);
                        const orderBoxes = Math.ceil(orderPcs / insightsData.boxSize);
                        
                        return (
                          <div key={size} className={`flex justify-between items-center p-3 text-sm font-bold ${index !== allSizes.length - 1 ? 'border-b border-gray-100' : ''}`}>
                             <span className="w-16 text-gray-900">{size}</span>
                             <span className={`flex-1 text-center ${cartBoxes > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{cartBoxes}</span>
                             <span className={`flex-1 text-right ${orderBoxes > 0 ? 'text-[#008A00]' : 'text-gray-300'}`}>{orderBoxes}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 🌟 EXACT CART GROUPING (LIKE BUYER APP) + DB FIX ── */}
      {isCartSheetOpen && viewingUserCart && (() => {
        const rebuiltCart = viewingUserCart.map((item: any) => {
          const p = Array.isArray(item.products) ? item.products[0] : item.products;
          if (!p) return null;
          
          const meta = safeParseJSON(p.meta, {});
          const sizesRaw = meta?.attributes?.available_sizes || {};
          const boxSize = meta?.attributes?.box_size?.[0] || 6;
          const imgData = safeParseJSON(p.img, { images: [] });
          const extraPrice = Number(sizesRaw[item.size]?.extra_price) || 0;
          const baseCost = Number(p.cost) || 0; 

          return {
            ...p,
            product_id: item.product_id, 
            selectedSize: item.size,
            qtyPieces: item.qty,
            boxSize: boxSize,
            unitPrice: baseCost + extraPrice,
            totalLineCost: item.qty * (baseCost + extraPrice),
            displayImg: imgData.images[0] || ''
          };
        }).filter(Boolean);

        const groups: Record<string, any> = {};
        rebuiltCart.forEach((item: any) => {
          const groupId = item.product_id; 
          
          if (!groups[groupId]) {
            groups[groupId] = { 
              id: groupId, 
              name: item.name || 'Unknown Product', 
              subcategory: item.subcategory || 'N/A', 
              displayImg: item.displayImg, 
              totalPrice: 0, 
              totalPcs: 0, 
              totalBoxes: 0, 
              sizesMap: {} 
            };
          }
          groups[groupId].sizesMap[item.selectedSize] = (groups[groupId].sizesMap[item.selectedSize] || 0) + item.qtyPieces;
          groups[groupId].totalPcs += item.qtyPieces;
          groups[groupId].totalBoxes += Math.ceil(item.qtyPieces / item.boxSize);
          groups[groupId].totalPrice += item.totalLineCost;
        });
        
        const groupedCart = Object.values(groups);
        
        const overallTotal = rebuiltCart.reduce((a: number, b: any) => a + b.totalLineCost, 0);

        return (
          <div className="fixed inset-0 z-[6000] flex justify-end flex-col">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartSheetOpen(false)}></div>
            <div className="bg-[#F5F5F6] w-full max-w-md mx-auto p-5 pb-10 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl max-h-[85vh] flex flex-col">
              
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 shrink-0"></div>
              
              <div className="flex justify-between items-center mb-5 shrink-0">
                 <h3 className="font-black text-xl text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
                   <ShoppingCart size={22} color="#2563eb" /> Live Truck
                 </h3>
                 <div className="flex items-center gap-3">
                   <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-black text-sm border border-blue-200 shadow-sm">
                     ₹{overallTotal}
                   </div>
                   <button onClick={() => setIsCartSheetOpen(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"><X size={20}/></button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1">
                {groupedCart.length === 0 ? (
                   <p className="text-center text-gray-500 font-bold mt-10">Cart is empty or items unavailable.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {groupedCart.map((group, idx) => (
                      <div key={idx} className="bg-white p-3.5 relative shadow-sm rounded-2xl border border-gray-100">
                        <div className="flex gap-4">
                           <div className="w-20 h-28 bg-gray-50 shrink-0 rounded-xl overflow-hidden border border-gray-100">
                             <img src={group.displayImg} className="w-full h-full object-cover" alt="" />
                           </div>
                           
                           <div className="flex-1 flex flex-col">
                              <h4 className="font-bold text-gray-900 text-[14px] leading-tight pr-2">{group.name}</h4>
                              <p className="text-gray-500 text-[11px] mt-0.5">{group.subcategory}</p>
                              <p className="font-black text-gray-900 text-[15px] mt-1.5">₹{group.totalPrice}</p>
                              <p className="font-medium text-gray-500 text-[11px] mt-0.5">Total: {group.totalBoxes} Box ({group.totalPcs} Pcs)</p>
                              
                              <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
                                 {Object.entries(group.sizesMap).map(([sz, q]: any) => (
                                    <span key={sz} className="text-[10px] font-bold bg-[#F8F9FA] text-gray-700 px-2 py-1 rounded border border-gray-200 shadow-sm">
                                      {sz}: <span className="text-blue-600">{q}</span>
                                    </span>
                                 ))}
                              </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {view !== 'order_detail' && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white border-t border-gray-200 flex justify-around py-3 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] pb-safe">
          <button onClick={() => setView('dashboard')} className="p-1.5 flex flex-col items-center gap-1">
            <LayoutDashboard className={view === 'dashboard' ? 'text-blue-600 scale-110' : 'text-gray-400'} size={20} /> 
            <span className={`text-[9px] font-bold ${view === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>Dashboard</span>
          </button>
          
          <button onClick={() => setView('orders')} className="p-1.5 flex flex-col items-center gap-1">
            <ClipboardList className={view === 'orders' ? 'text-blue-600 scale-110' : 'text-gray-400'} size={20} /> 
            <span className={`text-[9px] font-bold ${view === 'orders' ? 'text-blue-600' : 'text-gray-400'}`}>Orders</span>
          </button>

          <button onClick={() => setView('users')} className="p-1.5 flex flex-col items-center gap-1 -mt-4">
            <div className="bg-gray-900 text-white p-3 rounded-full shadow-lg border-2 border-white active:scale-95 transition-transform"><Users size={22} /></div>
            <span className={`text-[9px] font-bold ${view === 'users' ? 'text-gray-900' : 'text-gray-400'}`}>Users</span>
          </button>

          <button onClick={() => setView('products')} className="p-1.5 flex flex-col items-center gap-1">
            <Package className={view === 'products' ? 'text-blue-600 scale-110' : 'text-gray-400'} size={20} /> 
            <span className={`text-[9px] font-bold ${view === 'products' ? 'text-blue-600' : 'text-gray-400'}`}>Listings</span>
          </button>
        </nav>
      )}

    </div>
  );
}