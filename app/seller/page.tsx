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
  SlidersHorizontal, Copy, ClipboardList, User, MapPin, Truck, Save, Phone, Lock,
  Users, MessageCircle, ShoppingCart, TrendingUp, Calendar, Share2,
  Activity, UserPlus, ShoppingBag, FileText 
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
  return isNaN(dt.getTime()) ? "N/A" : dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const getWhatsAppLink = (phone: string, text: string = '') => {
  const encodedText = encodeURIComponent(text);
  let isAndroid = false;
  if (typeof window !== 'undefined') { isAndroid = /Android/i.test(navigator.userAgent); }
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

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [editedQtys, setEditedQtys] = useState<Record<number, number>>({});
  const [trackingUrl, setTrackingUrl] = useState('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [expectedDispatch, setExpectedDispatch] = useState(''); 
  const [orderFilter, setOrderFilter] = useState('All');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [visibleUsersCount, setVisibleUsersCount] = useState(20); 
  
  const [viewingUserCart, setViewingUserCart] = useState<any[] | null>(null);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  const [insightsSheetOpen, setInsightsSheetOpen] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [productsWithInsights, setProductsWithInsights] = useState<Set<number>>(new Set());
  const [productFilter, setProductFilter] = useState('All');

  // Address Sheet States
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({ address: '', city: '', state: '', pincode: '' });
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [uploadForm, setUploadForm] = useState({ name: '', subcategory: '', mrp: '', cost: '', description: '', boxSize: '6' });
  const [uploadImages, setUploadImages] = useState<File[]>([]);
  const [uploadImagePreviews, setUploadImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [sizeConfig, setSizeConfig] = useState<Record<string, { extra_price: number, is_active: boolean }>>({});
  const [isUploading, setIsUploading] = useState(false);

  const [activeSheet, setActiveSheet] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingSizeConfig, setEditingSizeConfig] = useState<Record<string, { extra_price: number, is_active: boolean }>>({});
  const [isUpdatingVariant, setIsUpdatingVariant] = useState(false);

  const [zoomOverlay, setZoomOverlay] = useState<{images: string[], currentIndex: number} | null>(null);

  const [dashStats, setDashStats] = useState({
    today: { active: 0, new: 0, buyers: 0, orders: 0, carts: 0 },
    week: { active: 0, new: 0, buyers: 0, orders: 0, carts: 0 }
  });

  const [newOrderItems, setNewOrderItems] = useState<any[]>([]); 
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [createOrderStep, setCreateOrderStep] = useState<'select_user' | 'cart' | 'add_item'>('select_user');
  const [draftUser, setDraftUser] = useState<any>(null);
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<any>(null);
  const [addSizeConfig, setAddSizeConfig] = useState<any>({});

  const calculateFinalRate = (product: any, sizeName: string, userObj: any) => {
    const productMeta = safeParseJSON(product.meta, {});
    const extraPrice = Number(productMeta?.attributes?.available_sizes?.[sizeName]?.extra_price || 0);
    
    // 🌟 REVERT: Cost ko wapas base bana diya
    const baseCost = Number(product.cost || 0) + extraPrice; 
    
    const discountPercent = Number(userObj?.discount_percent || safeParseJSON(userObj?.meta, {})?.discount_percent || 0);
    
    // 🌟 Logic: Cost - (Discount% of Cost)
    const discountAmount = baseCost * (discountPercent / 100);
    const finalRate = baseCost - discountAmount;
    
    return Number(finalRate.toFixed(2)); 
  };

  const fetchDashboardStats = async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0); 
      const startOfTodayMs = today.getTime(); const startOfTodayISO = today.toISOString(); 
      const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 7);
      const startOfWeekMs = lastWeek.getTime(); const startOfWeekISO = lastWeek.toISOString(); 

      const [{ data: oData }, { data: uData }, { data: cData }] = await Promise.all([
        supabase.from('orders').select('userid, createdAt').gte('createdAt', startOfWeekISO),
        supabase.from('users').select('created_at, meta'),
        supabase.from('cart_items').select('user_id, updated_at').gte('updated_at', startOfWeekISO)
      ]);

      let tActive = 0, tNew = 0, wActive = 0, wNew = 0;
      let tBuyers = new Set(), wBuyers = new Set(), tOrders = 0, wOrders = 0, tCarts = new Set(), wCarts = new Set();

      (oData || []).forEach(o => {
        wOrders++; wBuyers.add(o.userid);
        if (new Date(o.createdAt).getTime() >= startOfTodayMs) { tOrders++; tBuyers.add(o.userid); }
      });
      (cData || []).forEach(c => {
        wCarts.add(c.user_id);
        if (new Date(c.updated_at).getTime() >= startOfTodayMs) { tCarts.add(c.user_id); }
      });
      (uData || []).forEach(u => {
        if (u.created_at) {
          const ct = new Date(u.created_at).getTime(); 
          if (ct >= startOfWeekMs) wNew++;
          if (ct >= startOfTodayMs) tNew++;
        }
        let metaObj = safeParseJSON(u.meta, {});
        if (metaObj.lastSeen) {
          const ls = new Date(metaObj.lastSeen).getTime();
          if (ls >= startOfWeekMs) wActive++;
          if (ls >= startOfTodayMs) tActive++;
        }
      });
      setDashStats({ today: { active: tActive, new: tNew, buyers: tBuyers.size, orders: tOrders, carts: tCarts.size }, week: { active: wActive, new: wNew, buyers: wBuyers.size, orders: wOrders, carts: wCarts.size } });
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('nayika_naari_user'); 
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    else router.replace('/');
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      // 🌟 FIX: Categories ko fetch karne ka function call kar diya hai
      fetchCategories(); 
      
      if (view === 'dashboard') { fetchMyProducts(); fetchOrders(); fetchDashboardStats(); }
      else if (view === 'orders') { fetchOrders(); }
      else if (view === 'products') { fetchMyProducts(); }
      else if (view === 'users') { fetchUsersData(); }
    }
  }, [currentUser, view]);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500); };

  const handleGlobalScroll = (e: any) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setVisibleUsersCount(prev => prev + 20);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

  const fetchMyProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').eq('seller', currentUser?.name);
    if (data && data.length > 0) {
      const pIds = data.map((p: any) => p.id);
      const [ {data: cData}, {data: oData} ] = await Promise.all([
        supabase.from('cart_items').select('product_id, qty').in('product_id', pIds).eq('status', 0),
        supabase.from('order_details').select('productid').in('productid', pIds)
      ]);
      const activeIds = new Set<number>();
      const cartQtyMap = new Map<number, number>(); 
      cData?.forEach((c: any) => { activeIds.add(c.product_id); cartQtyMap.set(c.product_id, (cartQtyMap.get(c.product_id) || 0) + c.qty); });
      oData?.forEach((o: any) => activeIds.add(o.productid));
      setProductsWithInsights(activeIds);

      const enrichedData = data.map((p: any) => {
         const meta = safeParseJSON(p.meta, {});
         const totalQty = cartQtyMap.get(p.id) || 0;
         return { ...p, cartBoxes: Math.ceil(totalQty / (meta?.attributes?.box_size?.[0] || 6)) };
      });
      enrichedData.sort((a: any, b: any) => b.cartBoxes !== a.cartBoxes ? b.cartBoxes - a.cartBoxes : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyProducts(enrichedData);
    } else { setMyProducts([]); setProductsWithInsights(new Set()); }
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
        usersData?.forEach(u => { userMap.set(String(u.id), u.name); userMap.set(Number(u.id), u.name); });
      }
      setOrders(ordersData.map(o => ({ ...o, buyerName: userMap.get(o.userid) || userMap.get(String(o.userid)) || 'Unknown Buyer' })));
    } else { setOrders([]); }
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
        const totalBoxes = uCart.reduce((acc: number, c: any) => acc + Math.ceil(c.qty / (safeParseJSON(Array.isArray(c.products) ? c.products[0]?.meta : c.products?.meta, {})?.attributes?.box_size?.[0] || 6)), 0);
        return { ...u, orderCount: uOrders.length, lastOrder, lastCart, cartUnique: new Set(uCart.map(c => c.product_id)).size, cartPcs: uCart.reduce((acc, c) => acc + c.qty, 0), cartBoxes: totalBoxes, lastSeen: safeParseJSON(u.meta, {}).lastSeen || null, uCart };
      });
      enrichedUsers.sort((a, b) => {
        const getLatest = (user:any) => { const dates = [user.lastSeen, user.lastCart, user.lastOrder].filter(Boolean).map(d=>new Date(d).getTime()); return dates.length > 0 ? Math.max(...dates) : 0; };
        return getLatest(b) - getLatest(a);
      });
      setUsersList(enrichedUsers);
    }
    setLoading(false);
  };

  const openInsights = async (product: any) => {
    setInsightsSheetOpen(true); setLoadingInsights(true);
    try {
      const boxSize = safeParseJSON(product.meta, {})?.attributes?.box_size?.[0] || 6;
      const [ {data: cartItems}, {data: ordItems} ] = await Promise.all([
        supabase.from('cart_items').select('size, qty, user_id').eq('product_id', product.id).eq('status', 0),
        supabase.from('order_details').select('size, qty, remainingQty, orderid').eq('productid', product.id)
      ]);
      const cartSizes: any = {}; const cartUsers = new Set();
      (cartItems || []).forEach(c => { cartSizes[c.size] = (cartSizes[c.size] || 0) + c.qty; cartUsers.add(c.user_id); });
      const orderSizes: any = {}; const orderIds = new Set();
      (ordItems || []).forEach(o => { orderSizes[o.size] = (orderSizes[o.size] || 0) + (o.remainingQty ?? o.qty); orderIds.add(o.orderid); });
      
      let uniqueOrderUsers = 0;
      if (orderIds.size > 0) {
         const {data: oData} = await supabase.from('orders').select('userid').in('id', Array.from(orderIds));
         uniqueOrderUsers = new Set((oData || []).map(o => o.userid)).size;
      }
      setInsightsData({ product, boxSize, cartSizes, orderSizes, uniqueCartUsers: cartUsers.size, uniqueOrderUsers });
    } catch(e) { showToast("Failed to load insights"); } finally { setLoadingInsights(false); }
  };

 const openOrderDetails = async (order: any) => {
    setView('order_detail');
    setLoading(true);
    
    // 🌟 FIX: Clear any draft state from "New Order" flow before opening an existing order
    setDraftUser(null);
    setDraftItems([]);
    setNewOrderItems([]); 
    
    const { data: userData } = await supabase.from('users').select('discount_percent').eq('id', order.userid).single();
    const updatedOrder = { ...order, discount_percent: userData?.discount_percent || 0 };
    setSelectedOrder(updatedOrder);

    const orderMeta = safeParseJSON(updatedOrder.meta, {});
    setExpectedDispatch(orderMeta.expectedDispatch || '');

    const { data: items } = await supabase.from('order_details').select('*').eq('orderid', updatedOrder.id);
    if (items && items.length > 0) {
      const parsedItems = items.map(item => ({ ...item, meta: safeParseJSON(item.meta, {}) }));
      setOrderItems(parsedItems);
      const qtys: any = {};
      parsedItems.forEach((item: any) => {
        qtys[item.id] = item.remainingQty !== null && item.remainingQty !== undefined ? item.remainingQty : item.qty;
      });
      setEditedQtys(qtys);
    } else { setOrderItems([]); }
    
    setTrackingUrl(updatedOrder.tracking || '');
    setBillFile(null); 
    setOrderStatus(updatedOrder.status || 'Pending');
    setLoading(false);
  };

  const handleShareOrder = () => {
    if (!selectedOrder) return;
    let itemDetailsStr = ""; let calculatedTotal = 0;
    orderItems.forEach((item) => {
      const lineTotal = (editedQtys[item.id] ?? item.qty) * (item.rate || 0); calculatedTotal += lineTotal;
      itemDetailsStr += `- ${safeParseJSON(item.meta, {}).name || 'Product'} (${item.size}) x ${editedQtys[item.id] ?? item.qty} : ₹${lineTotal}\n`;
    });
    newOrderItems.forEach(item => {
      const lineTotal = item.qty * item.rate; calculatedTotal += lineTotal;
      itemDetailsStr += `- ${item.product.name} (${item.size}) x ${item.qty} : ₹${lineTotal} (New)\n`;
    });
    if (orderItems.length === 0 && newOrderItems.length === 0) calculatedTotal = selectedOrder.amount;

    let fullMsg = `New Order Placed!\nOrder ID: *#${selectedOrder.id}*\n\n*Items:*\n${itemDetailsStr}\n*Total Amount:* ₹${Math.round(calculatedTotal)}/-\n\n*Buyer Details:*\nName: ${selectedOrder.buyerName}\nPhone: ${selectedOrder.phone}\nCity: ${selectedOrder.city}\n\n(Please check stock & confirm dispatch)`;
    window.location.href = getWhatsAppLink('', fullMsg);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      let uploadedBillUrl = selectedOrder.bill;
      if (billFile) {
        const fileName = `bills/order_${selectedOrder.id}_${Date.now()}.${billFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, billFile);
        if (uploadError) throw uploadError;
        uploadedBillUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
      }

      let calculatedFinalAmount = 0; let isQtyChanged = false;
      if (orderItems.length > 0) {
        for (const item of orderItems) {
          calculatedFinalAmount += editedQtys[item.id] * item.rate;
          const origQ = item.remainingQty !== undefined && item.remainingQty !== null ? item.remainingQty : item.qty;
          if (editedQtys[item.id] !== origQ) isQtyChanged = true;
          await supabase.from('order_details').update({ remainingQty: editedQtys[item.id] }).eq('id', item.id);
        }
      } else calculatedFinalAmount = selectedOrder.amount;

      const validNewItems = newOrderItems.filter(item => item.qty > 0);
      if (validNewItems.length > 0) {
        let newItemsAmount = 0;
        let newBoxesAdded = 0;
        let newPcsAdded = 0;

        const inserts = validNewItems.map(item => {
          newItemsAmount += (item.qty * item.rate);
          const itemMeta = safeParseJSON(item.product.meta, {});
          const boxSize = itemMeta?.attributes?.box_size?.[0] || 6;
          const calculatedBoxes = Math.ceil(item.qty / boxSize);
          
          newBoxesAdded += calculatedBoxes;
          newPcsAdded += item.qty;

          return {
            orderid: selectedOrder.id, 
            productid: item.product.id, 
            size: item.size, 
            qty: item.qty, 
            remainingQty: item.qty, 
            rate: item.rate,
            userid: selectedOrder.userid, 
            box: calculatedBoxes,         
            // 🌟 FIX: Add MRP into meta when saving to DB
            meta: JSON.stringify({ 
                name: item.product.name, 
                img: safeParseJSON(item.product.img, {images:[]}).images[0] || '',
                mrp: item.product.mrp, 
                updatedBy: currentUser.id 
            })
          };
        });

        await supabase.from('order_details').insert(inserts);
        calculatedFinalAmount += newItemsAmount; 
        isQtyChanged = true;
        setNewOrderItems([]); 

        selectedOrder.box = (selectedOrder.box || 0) + newBoxesAdded;
        selectedOrder.pcs = (selectedOrder.pcs || 0) + newPcsAdded;
      }

      const statusChanged = selectedOrder.status !== orderStatus; 
      
      const orderMeta = safeParseJSON(selectedOrder.meta, {}); 
      orderMeta.expectedDispatch = expectedDispatch;
      orderMeta.updatedBy = currentUser.id;

      await supabase.from('orders').update({
          tracking: trackingUrl, 
          bill: uploadedBillUrl, 
          finalAmount: Math.round(calculatedFinalAmount), 
          status: orderStatus, 
          box: selectedOrder.box, 
          pcs: selectedOrder.pcs, 
          meta: JSON.stringify(orderMeta)
      }).eq('id', selectedOrder.id);

      if (statusChanged || isQtyChanged) {
        const { data: buyer } = await supabase.from('users').select('push_token').eq('id', selectedOrder.userid).single();
        if (buyer?.push_token) {
            let title = "Order Updated 📦"; let message = `Nayika Naari has updated your Order #${selectedOrder.id}.`;
            if (statusChanged && !isQtyChanged) {
                if (orderStatus === 'Dispatched') { title = "Order Dispatched! 🚚"; message = `Your order #${selectedOrder.id} is on its way.`; }
                else if (orderStatus === 'Delivered') { title = "Order Delivered! ✅"; message = `Your order #${selectedOrder.id} has been delivered.`; }
            }
            fetch('https://onesignal.com/api/v1/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic os_v2_app_xhy5hwdypfhdvchoiklithssky66nrwfhrkeoqvmiba3ekrjy6l74os35hmocacgqak2372msqja2433uywmuhcfyesyiwozn2o522y'}, body: JSON.stringify({ app_id: "b9f1d3d8-7879-4e3a-88ee-4296899e5256", include_player_ids: [buyer.push_token], headings: { en: title }, contents: { en: message }, url: `${window.location.origin}/?view=order_detail&order_id=${selectedOrder.id}` }) }).catch(e=>{});
        }
      }
      showToast("Order Updated Successfully!"); fetchOrders(); setView('orders');
    } catch (e: any) { alert("Error saving: " + e.message); } finally { setIsSavingOrder(false); }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUploadForm(prev => ({ ...prev, subcategory: e.target.value }));
    const category = categories.find(c => c.name === e.target.value);
    if (category) {
      const initialSizeConfig: any = {};
      safeParseJSON(category.sizes, []).forEach((size: string) => { initialSizeConfig[size] = { extra_price: 0, is_active: true }; });
      setSizeConfig(initialSizeConfig);
    } else setSizeConfig({});
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadImages(prev => [...prev, ...filesArray]);
      setUploadImagePreviews(prev => [...prev, ...filesArray.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeNewImage = (index: number) => { setUploadImages(prev => prev.filter((_, i) => i !== index)); setUploadImagePreviews(prev => prev.filter((_, i) => i !== index)); };
  const removeExistingImage = (index: number) => { setExistingImages(prev => prev.filter((_, i) => i !== index)); };

  const handleUploadProduct = async () => {
    if (!uploadForm.name || !uploadForm.subcategory || !uploadForm.mrp || !uploadForm.cost || (uploadImages.length === 0 && existingImages.length === 0)) return alert("Fill required fields and add 1 image.");
    setIsUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const file of uploadImages) {
        const filePath = `product_images/${currentUser.id}/${Date.now()}-${Math.random()}.${file.name.split('.').pop()}`;
        await supabase.storage.from('product-images').upload(filePath, file);
        imageUrls.push(supabase.storage.from('product-images').getPublicUrl(filePath).data.publicUrl);
      }
      
      const metaJSON = JSON.stringify({ attributes: { available_colors: [], box_size: [parseInt(uploadForm.boxSize) || 6], available_sizes: sizeConfig } });
      const mrp = parseFloat(uploadForm.mrp); const cost = parseFloat(uploadForm.cost);
      const productData = { name: uploadForm.name, subcategory: uploadForm.subcategory, mrp, cost, discount: Math.round(((mrp - cost) / mrp) * 100), description: uploadForm.description, status: 1, meta: metaJSON, img: JSON.stringify({ images: [...existingImages, ...imageUrls] }), seller: currentUser.name, ...(isEditMode ? {} : { createdAt: getLocalTimestamp() }) };

      if (isEditMode && editingProductId) await supabase.from('products').update(productData).eq('id', editingProductId);
      else await supabase.from('products').insert([productData]);
      
      showToast(isEditMode ? "Updated!" : "Uploaded!"); resetUploadForm(); fetchMyProducts();
      if (isEditMode) setView('products'); else window.scrollTo(0,0);
    } catch (e: any) { alert("Failed: " + e.message); } finally { setIsUploading(false); }
  };

  const resetUploadForm = () => { setIsEditMode(false); setEditingProductId(null); setUploadForm({ name: '', subcategory: '', mrp: '', cost: '', description: '', boxSize: '6' }); setUploadImages([]); setUploadImagePreviews([]); setExistingImages([]); setSizeConfig({}); };
  const startEditProduct = (p: any) => { setIsEditMode(true); setEditingProductId(p.id); setUploadForm({ name: p.name, subcategory: p.subcategory, mrp: p.mrp.toString(), cost: p.cost.toString(), description: p.description || '', boxSize: safeParseJSON(p.meta, {})?.attributes?.box_size?.[0]?.toString() || '6' }); setExistingImages(safeParseJSON(p.img, { images: [] }).images || []); setSizeConfig(safeParseJSON(p.meta, {})?.attributes?.available_sizes || {}); setUploadImages([]); setUploadImagePreviews([]); setView('upload'); };
  const startCopyProduct = (p: any) => { setIsEditMode(false); setEditingProductId(null); setUploadForm({ name: '', subcategory: p.subcategory, mrp: '', cost: '', description: p.description || '', boxSize: safeParseJSON(p.meta, {})?.attributes?.box_size?.[0]?.toString() || '6' }); setSizeConfig(safeParseJSON(p.meta, {})?.attributes?.available_sizes || {}); setExistingImages([]); setUploadImages([]); setUploadImagePreviews([]); setView('upload'); showToast("Details copied."); };
  const openVariantSheet = (p: any) => { setEditingProduct(p); setEditingSizeConfig(safeParseJSON(p.meta, {})?.attributes?.available_sizes || {}); setActiveSheet(true); };
  const saveVariantStatus = async () => { setIsUpdatingVariant(true); try { const meta = safeParseJSON(editingProduct.meta, {}); meta.attributes.available_sizes = editingSizeConfig; await supabase.from('products').update({ meta: JSON.stringify(meta) }).eq('id', editingProduct.id); showToast("Variants Updated!"); setActiveSheet(false); fetchMyProducts(); } catch (e: any) { alert("Failed: " + e.message); } finally { setIsUpdatingVariant(false); } };

  const safeUserQuery = userSearchQuery.toLowerCase().trim();
  const safePhoneQuery = safeUserQuery.replace(/\D/g, ''); 

  const filteredUsers = usersList.filter(u => {
    if (!safeUserQuery) return true;
    const matchName = u?.name?.toLowerCase().includes(safeUserQuery);
    const matchCity = u?.city?.toLowerCase().includes(safeUserQuery);
    const matchPhone = safePhoneQuery && u?.phone?.toString().includes(safePhoneQuery);
    return matchName || matchCity || matchPhone;
  });

  const displayedUsers = filteredUsers.slice(0, visibleUsersCount);

  const filteredProducts = myProducts.filter(p => {
    const search = p?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p?.subcategory?.toLowerCase().includes(searchQuery.toLowerCase());
    const sizes = safeParseJSON(p.meta, {})?.attributes?.available_sizes || {}; const keys = Object.keys(sizes);
    let status = 'Inactive';
    if (keys.length > 0) { const active = keys.filter(k => sizes[k].is_active !== false).length; status = active === keys.length ? 'Active' : active === 0 ? 'Inactive' : 'Partial'; }
    return search && (productFilter === 'All' || status === productFilter);
  });
  
  const filteredOrders = orders.filter(o => {
    return (o?.id?.toString().includes(searchQuery) || o?.buyerName?.toLowerCase().includes(searchQuery.toLowerCase()) || o?.city?.toLowerCase().includes(searchQuery.toLowerCase())) && (orderFilter === 'All' || o?.status === orderFilter);
  });

  if (!currentUser) return null;

  return (
    <div className="w-full max-w-md print:max-w-full print:w-full print:mx-0 print:border-none mx-auto bg-[#F8F9FA] print:bg-white min-h-screen font-sans text-gray-900 shadow-2xl print:shadow-none relative overflow-x-hidden print:overflow-visible flex flex-col pb-20 print:pb-0 border-x border-gray-100">
      
      {zoomOverlay && (
        <div className="fixed inset-0 z-[6000] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm">
          <button onClick={() => setZoomOverlay(null)} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full z-20"><X size={24} /></button>
          {zoomOverlay.images.length > 1 && <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest z-20">{zoomOverlay.currentIndex + 1} / {zoomOverlay.images.length}</div>}
          <div className="relative w-full max-w-md flex items-center justify-center h-full">
            {zoomOverlay.currentIndex > 0 && <button onClick={() => setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex - 1} : null)} className="absolute left-4 p-3 bg-white/10 text-white rounded-full z-10 hover:bg-white/20"><ChevronLeft size={28}/></button>}
            <img src={zoomOverlay.images[zoomOverlay.currentIndex]} className="w-full h-auto max-h-[85vh] object-contain transition-all duration-300" alt="Zoom" />
            {zoomOverlay.currentIndex < zoomOverlay.images.length - 1 && <button onClick={() => setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex + 1} : null)} className="absolute right-4 p-3 bg-white/10 text-white rounded-full z-10 rotate-180 hover:bg-white/20"><ChevronLeft size={28}/></button>}
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full z-[9999] text-xs font-bold tracking-widest shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-green-400" /> {toastMsg}
        </div>
      )}

      <header className="w-full px-4 py-3 bg-gray-900 text-white sticky top-0 z-40 flex items-center justify-between shadow-md print-hidden">
        <div className="flex items-center gap-3">
          {view !== 'dashboard' && (
            <button onClick={() => { if (view === 'upload' && isEditMode) { resetUploadForm(); setView('products'); } else if (view === 'order_detail') setView('orders'); else setView('dashboard'); }} className="p-1 hover:bg-white/10 rounded-md transition-colors"><ChevronLeft size={22} /></button>
          )}
          <div>
            <h1 className="font-black text-lg italic tracking-tighter leading-tight">SELLER PANEL</h1>
            <p className="text-[10px] text-gray-400 font-medium">Welcome, {currentUser.name}</p>
          </div>
        </div>
        <button onClick={() => router.replace('/')} className="text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded border border-white/20 active:scale-95 flex items-center gap-1">BUYER VIEW <ChevronRight size={12}/></button>
      </header>

      {/* 🌟 ON SCROLL ADDED TO MAIN */}
      <main className="flex-1 w-full overflow-y-auto scrollbar-hide" onScroll={handleGlobalScroll}>
        
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
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-6">
              <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><TrendingUp size={16} className="text-blue-600" /><h3 className="font-black text-xs text-gray-800 uppercase tracking-widest">Growth Metrics</h3></div>
                <button onClick={fetchDashboardStats} className="text-[9px] font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 active:scale-95"><Activity size={12}/> REFRESH</button>
              </div>
              <div className="p-0">
                 <table className="w-full text-left text-sm">
                    <thead><tr className="bg-gray-50/30 text-[9px] text-gray-400 uppercase tracking-widest"><th className="p-3 font-bold">Metric</th><th className="p-3 font-bold text-center border-l border-gray-100 bg-blue-50/30 text-blue-600">Today</th><th className="p-3 font-bold text-center border-l border-gray-100">7 Days</th></tr></thead>
                    <tbody className="font-semibold text-gray-700">
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors"><td className="p-3 text-[11px] flex items-center gap-2"><Activity size={14} className="text-green-500"/> Active Users</td><td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.active}</td><td className="p-3 text-center border-l border-gray-100">{dashStats.week.active}</td></tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors"><td className="p-3 text-[11px] flex items-center gap-2"><UserPlus size={14} className="text-purple-500"/> New Users</td><td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.new}</td><td className="p-3 text-center border-l border-gray-100">{dashStats.week.new}</td></tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors"><td className="p-3 text-[11px] flex items-center gap-2"><ShoppingBag size={14} className="text-orange-500"/> New Buyers</td><td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.buyers}</td><td className="p-3 text-center border-l border-gray-100">{dashStats.week.buyers}</td></tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors"><td className="p-3 text-[11px] flex items-center gap-2"><ClipboardList size={14} className="text-blue-500"/> Orders Placed</td><td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.orders}</td><td className="p-3 text-center border-l border-gray-100">{dashStats.week.orders}</td></tr>
                      <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors"><td className="p-3 text-[11px] flex items-center gap-2"><ShoppingCart size={14} className="text-pink-500"/> Truck Updated</td><td className="p-3 text-center border-l border-gray-100 text-gray-900 font-black bg-blue-50/30">{dashStats.today.carts}</td><td className="p-3 text-center border-l border-gray-100">{dashStats.week.carts}</td></tr>
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
          <div className="animate-in fade-in duration-300 flex flex-col min-h-full bg-[#F8F9FA]">
            <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-3 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3 w-full">
                <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 px-3 py-2 rounded-xl border border-blue-100 shrink-0 shadow-sm">
                   <span className="text-sm font-black leading-none">{filteredUsers.length}</span>
                   <span className="text-[8px] font-bold uppercase tracking-wider mt-1">Users</span>
                </div>
                <div className="relative flex items-center flex-1">
                  <div className="absolute left-3 text-gray-400"><Search size={16} /></div>
                  <input type="text" placeholder="Search Mobile or Name..." className="w-full bg-gray-100 text-sm font-semibold rounded-xl pl-10 pr-4 py-3 outline-none" value={userSearchQuery} onChange={e => { setUserSearchQuery(e.target.value); setVisibleUsersCount(20); }} />
                </div>
              </div>
            </div>

            <div className="p-3 flex flex-col gap-3 pb-24">
              {loading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div> ) : displayedUsers.length === 0 ? ( <div className="text-center py-20 text-gray-400 font-medium text-sm bg-white rounded-2xl border border-gray-200 shadow-sm mx-1 flex flex-col items-center"><Users size={40} className="mb-2 opacity-20"/><p>No users found.</p></div> ) : (
                <>
                {displayedUsers.map((u, index) => (
                  <div key={u.id || index} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm transition-transform">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-700 font-black rounded-full flex items-center justify-center text-lg uppercase shrink-0">{u.name ? u.name.charAt(0) : 'U'}</div>
                        <div>
                          <h3 className="font-black text-gray-900 text-[15px]">{u.name} <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded ml-1">-{u.discount_percent || 0}%</span></h3>
                          <p className="text-[10px] font-bold text-gray-500 mt-0.5"><MapPin size={10} className="inline mr-0.5 mb-0.5"/> {u.city || 'N/A'}, {u.state || 'N/A'}</p>
                          {u.password && (
                            <div onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(u.password); showToast("Password Copied! 🔐"); }} className="flex items-center gap-2 mt-2 bg-red-50/60 px-2 py-1.5 rounded-md border border-red-100 cursor-pointer w-fit">
                              <Lock size={10} className="text-red-500" /><span className="text-[10px] font-bold text-gray-600">Pass: <span className="font-mono text-red-700">{u.password}</span></span><Copy size={12} className="text-red-400 ml-1" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={`tel:+91${u.phone}`} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center active:scale-95 transition-transform"><Phone size={14}/></a>
                        <a href={getWhatsAppLink(`91${u.phone}`)} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center active:scale-95 transition-transform"><MessageCircle size={14}/></a>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-lg text-center mb-3">
                       <div onClick={() => { if(u.orderCount > 0) { setSearchQuery(u.name); setView('orders'); } }} className={`bg-white border border-gray-200 rounded py-2 shadow-sm ${u.orderCount > 0 ? 'cursor-pointer active:scale-95' : ''}`}>
                          <p className={`text-sm font-black ${u.orderCount > 0 ? 'text-blue-600' : 'text-gray-900'}`}>{u.orderCount}</p><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Orders</p>
                       </div>
                       <div onClick={() => { if(u.uCart?.length > 0) { setViewingUserCart(u.uCart); setIsCartSheetOpen(true); } else showToast("Cart is empty"); }} className="bg-white border border-gray-200 rounded py-2 shadow-sm cursor-pointer active:scale-95">
                          <p className="text-sm font-black text-blue-600">{u.cartBoxes}B / {u.cartPcs}P</p><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Cart Qty</p>
                       </div>
                       <div className="bg-white border border-gray-200 rounded py-2 shadow-sm"><p className="text-sm font-black text-gray-900">{u.cartUnique}</p><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Unique Items</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                       <div className="flex flex-col text-center"><span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Last Seen</span><span className="text-[10px] font-bold text-gray-700 leading-tight mt-0.5">{safeFormatDate(u.lastSeen)}</span></div>
                       <div className="flex flex-col text-center border-x border-gray-100"><span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Last Cart</span><span className="text-[10px] font-bold text-gray-700 leading-tight mt-0.5">{safeFormatDate(u.lastCart)}</span></div>
                       <div className="flex flex-col text-center"><span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Last Order</span><span className="text-[10px] font-bold text-gray-700 leading-tight mt-0.5">{safeFormatDate(u.lastOrder)}</span></div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length > visibleUsersCount && (
                  <button onClick={() => setVisibleUsersCount(prev => prev + 20)} className="w-full py-4 bg-white border border-gray-200 text-blue-600 font-bold text-sm rounded-xl shadow-sm active:scale-95">Load More Users</button>
                )}
                </>
              )}
            </div>
          </div>
        )}

        {view === 'upload' && (
          <div className="bg-white flex-1 animate-in slide-in-from-right duration-300 min-h-full">
            <div className="p-4 bg-gray-50 border-b border-gray-200 mb-4 sticky top-0 z-30"><h2 className="font-black text-gray-800 uppercase tracking-wider text-sm flex items-center gap-2">{isEditMode ? <Edit2 size={16}/> : <UploadCloud size={16}/>} {isEditMode ? 'Edit Product' : 'Upload New Product'}</h2></div>
            <div className="px-4 space-y-5 pb-10">
              <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Product Name</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none" value={uploadForm.name} onChange={e => setUploadForm({...uploadForm, name: e.target.value})} /></div>
              <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label><select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none appearance-none" value={uploadForm.subcategory} onChange={handleCategoryChange} disabled={isEditMode}><option value="" disabled>Select Category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Cost Price (₹)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-black outline-none" value={uploadForm.cost} onChange={e => setUploadForm({...uploadForm, cost: e.target.value})} /></div>
                <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">MRP (₹)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 outline-none" value={uploadForm.mrp} onChange={e => setUploadForm({...uploadForm, mrp: e.target.value})} /></div>
              </div>
              <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">MOQ Box Size</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none" value={uploadForm.boxSize} onChange={e => setUploadForm({...uploadForm, boxSize: e.target.value})} /></div>
              {Object.keys(sizeConfig).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-3 block border-b border-gray-200 pb-2">Size Configuration</label>
                  <div className="space-y-3">
                    {Object.keys(sizeConfig).map((size) => (
                        <div key={size} className="flex items-center justify-between"><div className="font-black text-gray-800 w-12">{size}</div><div className="flex items-center gap-2 flex-1"><span className="text-xs font-bold text-gray-400">+ ₹</span><input type="number" value={sizeConfig[size].extra_price || ''} onChange={(e) => setSizeConfig(prev => ({...prev, [size]: {...prev[size], extra_price: parseInt(e.target.value) || 0}}))} className="w-full max-w-[100px] bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-800" /></div><button onClick={() => setSizeConfig(prev => ({...prev, [size]: {...prev[size], is_active: !(sizeConfig[size].is_active !== false)}}))} className="text-gray-500 transition-colors">{(sizeConfig[size].is_active !== false) ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} />}</button></div>
                    ))}
                  </div>
                </div>
              )}
              <div><label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label><textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none h-24" value={uploadForm.description} onChange={e => setUploadForm({...uploadForm, description: e.target.value})} /></div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-1"><ImageIcon size={14}/> Images</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {existingImages.map((src, index) => ( <div key={`ex-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200"><img src={src} className="w-full h-full object-cover" alt=""/><button onClick={() => removeExistingImage(index)} className="absolute top-1 right-1 bg-white/90 p-1 rounded text-red-600"><Trash2 size={14}/></button></div> ))}
                  {uploadImagePreviews.map((src, index) => ( <div key={`nw-${index}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-200"><img src={src} className="w-full h-full object-cover" alt=""/><button onClick={() => removeNewImage(index)} className="absolute top-1 right-1 bg-white/90 p-1 rounded text-red-600"><Trash2 size={14}/></button></div> ))}
                  {(existingImages.length + uploadImagePreviews.length) < 5 && ( <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 bg-white cursor-pointer"><Plus size={24} /><span className="text-[10px] font-bold">Add Photo</span><input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} /></label> )}
                </div>
              </div>
              <button onClick={handleUploadProduct} disabled={isUploading} className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 bg-gray-900 text-white shadow-sm active:scale-95">{isUploading ? <Loader2 className="animate-spin" size={18} /> : (isEditMode ? <CheckCircle2 size={18} /> : <UploadCloud size={18} />)} {isUploading ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Publish Product')}</button>
            </div>
          </div>
        )}

        {/* ── 🌟 VIEW: PRODUCTS LISTING ── */}
        {view === 'products' && (
          <div className="animate-in fade-in duration-300 flex flex-col min-h-full bg-[#F8F9FA]">
            <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-3 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3 w-full">
                <div className="flex flex-col items-center justify-center bg-purple-50 text-purple-700 px-3 py-2 rounded-xl border border-purple-200 shrink-0 shadow-sm">
                   <span className="text-sm font-black leading-none">{filteredProducts.length}</span><span className="text-[8px] font-bold uppercase tracking-wider mt-1">Listings</span>
                </div>
                <div className="relative flex items-center flex-1">
                  <div className="absolute left-3 text-gray-400"><Search size={16} /></div>
                  <input type="text" placeholder="Search listings..." className="w-full bg-gray-100 text-sm font-semibold rounded-xl pl-10 pr-4 py-3 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {['All', 'Active', 'Partial', 'Inactive'].map(status => (
                  <button key={status} onClick={() => setProductFilter(status)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${productFilter === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{status}</button>
                ))}
              </div>
            </div>

            <div className="p-3 flex flex-col gap-3 pb-24">
              {loading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div> ) : filteredProducts.map(p => {
                  const imgData = safeParseJSON(p.img, { images: [] }); const metaData = safeParseJSON(p.meta, {});
                  const sizesRaw = metaData?.attributes?.available_sizes || {}; const sizeKeys = Object.keys(sizesRaw);
                  const activeSizesCount = sizeKeys.filter(k => sizesRaw[k].is_active !== false).length;
                  return (
                    <div key={p.id} className="bg-white rounded-2xl p-3 border border-gray-200 shadow-sm flex gap-3 relative overflow-hidden">
                      <div className="w-24 h-24 bg-gray-50 rounded-xl p-1 shrink-0 border border-gray-100 cursor-zoom-in" onClick={() => setZoomOverlay({images: imgData.images, currentIndex: 0})}><img src={imgData.images[0] || ''} className="w-full h-full object-cover rounded-lg mix-blend-multiply" alt="" /></div>
                      <div className="flex-1 flex flex-col justify-between py-1 overflow-hidden">
                        <div>
                          <div className="flex justify-between items-start gap-2"><h3 className="font-bold text-gray-900 text-sm truncate">{p.name}</h3><span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 border border-gray-200">{p.subcategory}</span></div>
                          <div className="flex items-center gap-1.5 mt-1"><p className="font-black text-gray-900 text-base">₹{p.cost}</p><p className="text-[10px] text-gray-400 line-through font-bold">₹{p.mrp}</p></div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                          <button onClick={() => startEditProduct(p)} className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-1.5 rounded-md"><Edit2 size={12} /> Edit</button>
                          <button onClick={() => startCopyProduct(p)} className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-1.5 rounded-md"><Copy size={12} /> Copy</button>
                          <button onClick={() => openVariantSheet(p)} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md"><SlidersHorizontal size={12} /> Sizes: <span className={activeSizesCount === 0 ? "text-red-500" : ""}>{activeSizesCount}/{sizeKeys.length}</span></button>
                          {productsWithInsights.has(p.id) && <button onClick={() => openInsights(p)} className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1.5 rounded-md border border-purple-100"><TrendingUp size={12} /> Insights</button>}
                        </div>
                      </div>
                      {(p.status === 0 || p.status === false) && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none"><span className="bg-red-500 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase">Disabled</span></div>}
                    </div>
                  )
                })
              }
            </div>
          </div>
        )}

        {/* ── 🌟 VIEW 4: ORDERS LISTING ── */}
        {view === 'orders' && (
          <div className="animate-in fade-in duration-300 flex flex-col min-h-full bg-[#F8F9FA]">
            <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-3 sticky top-0 z-30 shadow-sm">
              <div className="flex items-center gap-3 w-full">
                <div className="flex flex-col items-center justify-center bg-[#E5F7ED] text-[#008A00] px-3 py-2 rounded-xl border border-green-200 shrink-0 shadow-sm">
                   <span className="text-sm font-black leading-none">{filteredOrders.length}</span><span className="text-[8px] font-bold uppercase tracking-wider mt-1">Orders</span>
                </div>
                
                <div className="flex items-center gap-2 w-full mt-2">
                  <div className="relative flex items-center flex-1">
                    <div className="absolute left-3 text-gray-400"><Search size={16} /></div>
                    <input type="text" placeholder="Search orders..." className="w-full bg-gray-100 text-sm font-semibold rounded-xl pl-10 pr-4 py-3 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  <button 
                    onClick={() => { 
                      setDraftUser(null); setDraftItems([]); setCreateOrderStep('select_user'); setIsCreateOrderOpen(true); 
                      if (usersList.length === 0) fetchUsersData();
                    }} 
                    className="bg-gray-900 text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 flex items-center gap-2 shadow-sm whitespace-nowrap">
                    <Plus size={16} /> New Order
                  </button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {['All', 'Pending', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'].map(status => (
                  <button key={status} onClick={() => setOrderFilter(status)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${orderFilter === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{status}</button>
                ))}
              </div>
            </div>

            <div className="p-3 flex flex-col gap-3 pb-24">
              {loading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" size={32} /></div> ) : filteredOrders.map((o) => {
                  const finalAmt = (o.finalAmount !== null && o.finalAmount !== undefined) ? o.finalAmount : o.amount;
                  return (
                    <div key={o.id} onClick={() => openOrderDetails(o)} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                      <div className="flex justify-between items-start mb-3">
                        <div><p className="text-[10px] font-bold text-gray-400">ORDER #{o.id}</p><h3 className="font-black text-gray-900 text-sm truncate max-w-[180px]">{o.buyerName}</h3></div>
                        <div className="text-right"><p className="font-black text-[#008A00] text-base">₹{finalAmt}</p><p className="text-[9px] font-bold text-gray-400">{safeFormatDate(o.createdAt)}</p></div>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center gap-1"><Package size={14}/> {o.box} Box</div><div className="flex items-center gap-1"><SlidersHorizontal size={14}/> {o.pcs} Pcs</div><div className="flex items-center gap-1"><MapPin size={14}/> {o.city}</div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shrink-0 ${o.status === 'Dispatched' ? 'bg-blue-50 text-blue-700' : o.status === 'Delivered' ? 'bg-[#E5F7ED] text-[#008A00]' : o.status === 'Cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{o.status}</span>
                        {(o.status === 'Confirmed' && safeParseJSON(o.meta, {})?.expectedDispatch) && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center gap-1"><Calendar size={10} /> {new Date(safeParseJSON(o.meta, {})?.expectedDispatch).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        )}

        {/* ── 🌟 VIEW 5: ORDER DETAIL PAGE ── */}
        {view === 'order_detail' && selectedOrder && (
          <div className="animate-in slide-in-from-right duration-300 flex flex-col min-h-full bg-[#F8F9FA] pb-24">
            
            {/* 🌟 NAYA: Proper Print Invoice Layout Styles */}
           <style dangerouslySetInnerHTML={{__html: `
              @media print {
                @page { size: A4 portrait; margin: 15mm; }
                body, html { background-color: white !important; width: 100% !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .print-hidden, header, nav { display: none !important; }
                main { overflow: visible !important; height: auto !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
                .shadow-sm, .shadow-2xl { box-shadow: none !important; border: none !important; }
              }
            `}} />

            {/* Print Header UI (Visible ONLY when printing) */}
            <div className="hidden print:block bg-white text-black w-full" style={{ fontFamily: "sans-serif" }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-widest text-blue-800 uppercase mb-2">INVOICE</h1>
                  <h2 className="text-xl font-bold">{currentUser?.name || 'Seller Fashion'}</h2>
                  <p className="text-xs text-gray-600 mt-1">Mobile: {currentUser?.phone || '+91 -'}</p>
                </div>
                <div className="text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Original For Recipient
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-black py-3 mb-6 text-sm">
                <div>
                  <p><span className="font-bold">Invoice #:</span> INV-{selectedOrder.id}</p>
                  <p className="mt-1"><span className="font-bold">Customer Details:</span></p>
                  <p className="font-bold uppercase">{selectedOrder.buyerName}</p>
                  <p>Ph: {selectedOrder.phone}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Invoice Date:</span> {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
                  <p className="mt-1"><span className="font-bold">Dispatch To:</span></p>
                  <p>{selectedOrder.address}</p>
                  <p>{selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}</p>
                </div>
              </div>

              <table className="w-full text-left text-sm mb-6 border-collapse">
                <thead>
                  <tr className="border-y-2 border-black bg-gray-50/50">
                    <th className="py-2 px-1 font-bold">#</th>
                    <th className="py-2 px-1 font-bold">Item</th>
                    <th className="py-2 px-1 font-bold text-center">Size</th>
                    <th className="py-2 px-1 font-bold text-right">MRP</th>
                    <th className="py-2 px-1 font-bold text-right">Rate</th>
                    <th className="py-2 px-1 font-bold text-center">Qty</th>
                    <th className="py-2 px-1 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="border-b-2 border-black">
                  {[...orderItems.map((item) => ({ ...item, isNew: false })), ...newOrderItems.map(item => ({ ...item, isNew: true, meta: {name: item.product.name, mrp: item.product.mrp} }))].map((item, idx) => {
                    const qty = item.isNew ? item.qty : (editedQtys[item.id] !== undefined ? editedQtys[item.id] : (item.remainingQty ?? item.qty));
                    const meta = safeParseJSON(item.meta, {});
                    
                    // 🌟 FIX: Agar order purana hai aur meta mein MRP nahi hai, toh live products list se fetch karo
                    const mrp = item.isNew ? item.product.mrp : (meta.mrp || myProducts.find(p => p.id === item.productid)?.mrp);
                    
                    const name = item.isNew ? item.product.name : meta.name;
                    const amount = qty * item.rate;

                    if (qty <= 0) return null; 

                    return (
                      <tr key={idx} className="border-b border-gray-200 last:border-0">
                        <td className="py-3 px-1">{idx + 1}</td>
                        <td className="py-3 px-1 uppercase font-semibold">{name}</td>
                        <td className="py-3 px-1 font-bold text-center">{item.size}</td>
                        <td className="py-3 px-1 text-right text-gray-500">{mrp ? `₹${Number(mrp).toFixed(2)}` : '-'}</td>
                        <td className="py-3 px-1 text-right font-medium">₹{Number(item.rate).toFixed(2)}</td>
                        <td className="py-3 px-1 text-center font-black text-gray-800">{qty}</td>
                        <td className="py-3 px-1 text-right font-black text-gray-900">₹{amount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {(() => {
                 let currentCalc = 0;
                 let totalItemsQty = 0;
                 orderItems.forEach(item => { 
                    const q = editedQtys[item.id] !== undefined ? editedQtys[item.id] : (item.remainingQty ?? item.qty);
                    currentCalc += q * item.rate; 
                    totalItemsQty += q;
                 });
                 newOrderItems.forEach(item => { 
                    currentCalc += (item.qty * item.rate); 
                    totalItemsQty += item.qty;
                 });
                 if(orderItems.length === 0 && newOrderItems.length === 0) currentCalc = selectedOrder.amount;

                 return (
                    <div className="flex justify-between items-end pt-2">
                      <div className="text-xs text-gray-500 font-bold">Total Items / Qty: {orderItems.length + newOrderItems.length} / {totalItemsQty}</div>
                      <div className="text-right w-1/3">
                        <div className="flex justify-between font-bold text-sm border-b border-gray-200 pb-1 mb-1">
                          <span>Total</span>
                          <span>₹{Math.round(currentCalc).toLocaleString('en-IN')}.00</span>
                        </div>
                        
                      </div>
                    </div>
                 );
              })()}
            </div>

            <div className="bg-white p-4 border-b border-gray-200 shadow-sm sticky top-0 z-30 print-hidden">
              <div className="flex justify-between items-start mb-2">
                <div><h2 className="font-black text-gray-900 text-lg">{selectedOrder.buyerName}</h2><p className="text-[10px] text-gray-400 font-bold mt-1">{safeFormatDate(selectedOrder.createdAt)}</p></div>
                <div className="flex items-center gap-2">
                  {/* 🌟 NAYA: View Bill CTA */}
                  <button onClick={() => window.print()} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-100 flex items-center gap-1.5 hover:bg-blue-100 active:scale-95"><FileText size={12} />Bill</button>
                  <button onClick={handleShareOrder} className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-200 flex items-center gap-1.5"><Share2 size={12} /></button>
                  <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md shrink-0 h-fit outline-none border bg-gray-50"><option>Pending</option><option>Confirmed</option><option>Dispatched</option><option>Delivered</option><option>Cancelled</option></select>
                </div>
              </div>
              <div onClick={() => { navigator.clipboard.writeText(`Name: ${selectedOrder.buyerName}\nPhone: ${selectedOrder.phone}\nAddress: ${selectedOrder.address}, ${selectedOrder.city}, ${selectedOrder.state} - ${selectedOrder.pincode}`); showToast("Copied! ✅"); }} className="text-xs font-semibold text-gray-600 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="flex items-center gap-2"><User size={14}/> {selectedOrder.buyerName}</p><p className="flex items-center gap-2 mt-1.5"><MapPin size={14}/> {selectedOrder.address}, {selectedOrder.city}</p>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                  <a href={`tel:+91${selectedOrder.phone}`} className="flex-1 flex justify-center items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-100 px-3 py-2 rounded-lg"><Phone size={14}/> Call</a>
                  <a href={getWhatsAppLink(`91${selectedOrder.phone}`)} target="_blank" rel="noreferrer" className="flex-1 flex justify-center items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-100 px-3 py-2 rounded-lg"><MessageCircle size={14}/> WhatsApp</a>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4 print-hidden">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2"><Package size={16}/> Ordered Items</h3>
                <button 
                  onClick={() => { 
                    setDraftUser(null);
                    setCreateOrderStep('add_item'); 
                    setIsCreateOrderOpen(true); 
                    if (usersList.length === 0) fetchUsersData(); 
                  }} 
                  className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 border border-blue-100 flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
              
              {loading ? ( <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div> ) : (
                (() => {
                  const groupedItems = orderItems.reduce((acc, item) => {
                    const pId = item.productid;
                    if(!acc[pId]) acc[pId] = { product: null, name: item.meta?.name || 'Product', img: item.meta?.img || '', items: [], unsavedItems: [] };
                    acc[pId].items.push(item);
                    return acc;
                  }, {});

                  newOrderItems.forEach((item, index) => {
                    const pId = item.product.id;
                    if(!groupedItems[pId]) groupedItems[pId] = { product: item.product, name: item.product.name, img: safeParseJSON(item.product.img, {images:[]}).images[0] || '', items: [], unsavedItems: [] };
                    if(!groupedItems[pId].unsavedItems) groupedItems[pId].unsavedItems = [];
                    groupedItems[pId].unsavedItems.push({ ...item, _originalIndex: index });
                  });

                  return Object.entries(groupedItems).map(([pId, group]: any) => (
                    <div key={pId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-3 items-center">
                        <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 p-0.5 shrink-0" onClick={() => setZoomOverlay({images: [group.img], currentIndex: 0})}><img src={group.img} className="w-full h-full object-cover rounded-md" alt="" /></div>
                        <h4 className="font-bold text-sm text-gray-900 truncate flex-1">{group.name}</h4>
                        {/* Pencil Icon for Unsaved Drafts */}
                       {group.unsavedItems?.length > 0 && (
                           <button onClick={() => {
                              const p = group.product || group.unsavedItems[0].product;
                              setSelectedProductForAdd(p);
                              const sizes = safeParseJSON(p.meta, {})?.attributes?.available_sizes || {};
                              const initialConfig: any = {};
                              Object.keys(sizes).forEach(sz => { initialConfig[sz] = 0; });
                              group.unsavedItems.forEach((ui:any) => { initialConfig[ui.size] = ui.qty; });
                              setAddSizeConfig(initialConfig);
                              setDraftUser(null);
                              setCreateOrderStep('add_item');
                              setIsCreateOrderOpen(true);
                           }} className="text-blue-600 bg-blue-50 p-1.5 rounded-md hover:bg-blue-100 active:scale-95"><Edit2 size={14}/></button>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        {group.items?.map((item: any) => {
                          const origQ = item.remainingQty !== undefined && item.remainingQty !== null ? item.remainingQty : item.qty;
                          const currentQ = editedQtys[item.id] !== undefined ? editedQtys[item.id] : origQ;
                          const isChanged = currentQ !== origQ;
                          return (
                            <div key={item.id} className="flex justify-between items-center text-sm font-bold bg-white border border-gray-100 p-2 rounded-lg">
                              <span className="w-10">{item.size}</span>
                              <span className={`w-16 text-center text-[10px] ${isChanged ? 'text-red-400 line-through' : 'text-gray-500 font-bold'}`}>{origQ}</span>
                              <div className="w-20 flex justify-center"><input type="number" className="w-14 text-center bg-blue-50 border border-blue-200 text-blue-700 rounded-md py-1 outline-none font-black" value={currentQ} onChange={(e) => setEditedQtys(prev => ({...prev, [item.id]: parseInt(e.target.value) || 0}))} /></div>
                              
                              <div className="flex flex-col items-end w-16 shrink-0">
                                <span className="text-right text-gray-700 leading-tight">₹{item.rate}</span>
                                {item.meta?.mrp && <span className="text-[8px] text-gray-400 line-through">₹{item.meta.mrp}</span>}
                              </div>

                            </div>
                          )
                        })}
                        
                        {group.unsavedItems?.map((item: any) => {
                          const lineTotal = Number((item.rate * item.qty).toFixed(2));
                          return (
                          <div key={`unsaved-${item._originalIndex}`} className="flex justify-between items-center text-sm font-bold bg-[#F0FDF4] border border-[#BBF7D0] p-2 rounded-lg relative transition-all">
                            <span className="w-10 text-green-900 relative">
                               {item.size}
                               <span className="absolute -top-3 left-0 bg-green-500 text-white text-[7px] px-1 rounded-sm tracking-widest">NEW</span>
                            </span>
                            <span className="w-12 text-center text-green-300">-</span>
                            <div className="w-20 flex justify-center">
                               <input type="number" className="w-14 text-center bg-white border border-green-300 text-green-800 rounded-md py-1 outline-none font-black shadow-sm" 
                                  value={item.qty} 
                                  onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      const updated = [...newOrderItems];
                                      updated[item._originalIndex].qty = val;
                                      setNewOrderItems(updated);
                                  }} 
                               />
                            </div>
                           
                           <div className="flex items-center justify-end w-20 gap-1">
                               <div className="flex flex-col items-end">
                                 <span className="text-right text-green-800 shrink-0 leading-tight">₹{lineTotal}</span>
                                 <span className="text-[8px] text-gray-400 line-through">₹{item.product.mrp * item.qty}</span>
                               </div>
                               <button onClick={() => {
                                   const updated = newOrderItems.filter((_, idx) => idx !== item._originalIndex);
                                   setNewOrderItems(updated);
                               }} className="text-red-500 hover:bg-red-100 p-1.5 rounded-md ml-1 active:scale-95 transition-transform"><Trash2 size={14}/></button>
                            </div>

                          </div>
                        )})}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white p-3 border-t border-gray-200 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] print-hidden">
              {(() => {
                let currentCalc = 0;
                orderItems.forEach(item => { currentCalc += (editedQtys[item.id] !== undefined ? editedQtys[item.id] : (item.remainingQty ?? item.qty)) * item.rate; });
                newOrderItems.forEach(item => { currentCalc += (item.qty * item.rate); });
                if(orderItems.length === 0 && newOrderItems.length === 0) currentCalc = selectedOrder.amount;
                
                return (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col pl-2"><span className="text-[10px] font-bold text-gray-400 uppercase">Final Amount</span><span className="text-lg font-black text-gray-900">₹{Math.round(currentCalc)}/-</span></div>
                    <button onClick={handleSaveOrder} disabled={isSavingOrder} className="flex-1 bg-[#FCE28A] text-black py-3.5 rounded-xl font-black active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                      {isSavingOrder ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} {isSavingOrder ? 'Saving...' : 'Save Updates'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* ── 🌟 LIVE TRUCK: MRP BASED DISCOUNT + NaN FIX ── */}
      {isCartSheetOpen && viewingUserCart && (() => {
        const rebuiltCart = viewingUserCart.map((item: any) => {
          const p = Array.isArray(item.products) ? item.products[0] : item.products;
          if (!p) return null;
          
          const meta = safeParseJSON(p.meta, {});
          const sizesRaw = meta?.attributes?.available_sizes || {};
          const boxSize = meta?.attributes?.box_size?.[0] || 6;
          const imgData = safeParseJSON(p.img, { images: [] });
          
         const productMRP = Number(p.mrp || 0);
          const extraPrice = Number(sizesRaw[item.size]?.extra_price || 0);
          
          // 🌟 REVERT: Cart mein bhi Cost ko base bana diya
          const baseCost = Number(p.cost || 0) + extraPrice; 
          
          const cartUserId = item.user_id;
          const cartUser = usersList.find(u => u.id === cartUserId) || {};
          const discountPercent = Number(cartUser.discount_percent || safeParseJSON(cartUser.meta, {})?.discount_percent || 0);
          
          const discountAmount = baseCost * (discountPercent / 100);
          const finalRate = baseCost - discountAmount;

          return {
            ...p,
            product_id: item.product_id, 
            selectedSize: item.size,
            qtyPieces: Number(item.qty || 0),
            boxSize: Number(boxSize || 6),
            unitPrice: Number(finalRate.toFixed(2)),
            totalLineCost: Number(item.qty || 0) * Number(finalRate.toFixed(2)),
            displayImg: imgData.images[0] || '',
            mrp: productMRP
          };
        }).filter(Boolean);

        const groups = {};
        rebuiltCart.forEach((item) => {
          const groupId = item.product_id; 
          if (!groups[groupId]) {
            groups[groupId] = { 
              id: groupId, name: item.name || 'Product', subcategory: item.subcategory || 'N/A', 
              displayImg: item.displayImg, totalPrice: 0, totalPcs: 0, totalBoxes: 0, 
              sizesMap: {}, mrp: item.mrp
            };
          }
          groups[groupId].sizesMap[item.selectedSize] = (groups[groupId].sizesMap[item.selectedSize] || 0) + item.qtyPieces;
          groups[groupId].totalPcs += item.qtyPieces;
          groups[groupId].totalBoxes += Math.ceil(item.qtyPieces / item.boxSize);
          groups[groupId].totalPrice += item.totalLineCost;
        });
        
        const groupedCart = Object.values(groups);
        const overallTotal = rebuiltCart.reduce((a, b) => a + b.totalLineCost, 0);

        return (
          <div className="fixed inset-0 z-[6000] flex justify-end flex-col print-hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCartSheetOpen(false)}></div>
            <div className="bg-[#F5F5F6] w-full max-w-md mx-auto p-5 pb-10 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5 shrink-0"></div>
              <div className="flex justify-between items-center mb-5 shrink-0">
                 <h3 className="font-black text-xl text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
                   <ShoppingCart size={22} color="#2563eb" /> Live Truck
                 </h3>
                 <div className="flex items-center gap-3">
                   <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-black text-sm border border-blue-200 shadow-sm">
                     ₹{Math.round(overallTotal || 0)}
                   </div>
                   <button onClick={() => setIsCartSheetOpen(false)} className="p-2 bg-gray-200 rounded-full"><X size={20}/></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                {groupedCart.length === 0 ? (
                   <p className="text-center text-gray-500 font-bold mt-10">Cart is empty.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {groupedCart.map((group, idx) => (
                      <div key={idx} className="bg-white p-3.5 shadow-sm rounded-2xl border border-gray-100">
                        <div className="flex gap-4">
                           <div className="w-20 h-24 bg-gray-50 shrink-0 rounded-xl overflow-hidden border">
                             <img src={group.displayImg} className="w-full h-full object-cover" alt="" />
                           </div>
                           <div className="flex-1 flex flex-col">
                              <h4 className="font-bold text-gray-900 text-[14px] truncate">{group.name}</h4>
                              <p className="text-gray-500 text-[11px]">{group.subcategory}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="font-black text-blue-600">₹{Math.round(group.totalPrice)}</p>
                                <p className="text-[10px] text-gray-400 line-through font-bold">₹{group.mrp * group.totalPcs}</p>
                              </div>
                              <p className="font-medium text-gray-400 text-[10px] mt-1">{group.totalBoxes} Box ({group.totalPcs} Pcs)</p>
                              <div className="mt-2 pt-2 border-t border-gray-50 flex flex-wrap gap-1.5">
                                 {Object.entries(group.sizesMap).map(([sz, q]) => (
                                    <span key={sz} className="text-[9px] font-bold bg-gray-50 text-gray-600 px-2 py-0.5 rounded border">
                                      {sz}: {q}
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

      {/* ── 🌟 NEW BOTTOM SHEET: CREATE ORDER / ADD ITEM FLOW ── */}
      {isCreateOrderOpen && (
        <div className="fixed inset-0 z-[6000] flex justify-end flex-col print-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsCreateOrderOpen(false); setSelectedProductForAdd(null); }}></div>
          <div className="bg-[#F8F9FA] w-full max-w-md mx-auto rounded-t-[2rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl flex flex-col h-[90vh]">
            
            <div className="p-4 border-b border-gray-200 bg-white rounded-t-[2rem] shrink-0 flex justify-between items-center">
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                {createOrderStep === 'select_user' ? <Users size={18}/> : createOrderStep === 'cart' ? <ShoppingCart size={18}/> : <Package size={18}/>}
                {createOrderStep === 'select_user' ? 'Select Customer' : createOrderStep === 'cart' ? 'Draft Order' : 'Add Product'}
              </h3>
              <button onClick={() => { setIsCreateOrderOpen(false); setSelectedProductForAdd(null); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={16}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4" onScroll={handleGlobalScroll}>
              
              {createOrderStep === 'select_user' && (
                <>
                  <input type="text" placeholder="Search Mobile or Name..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none" value={userSearchQuery} onChange={e => { setUserSearchQuery(e.target.value); setVisibleUsersCount(20); }} />
                  <div className="space-y-2 mt-4">
                    {loading ? (
                      <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
                    ) : displayedUsers.length === 0 ? (
                      <p className="text-center text-gray-400 text-xs font-medium py-4">No users found.</p>
                    ) : (
                      displayedUsers.map(u => (
                        <div key={u.id} onClick={() => { setDraftUser(u); setCreateOrderStep('cart'); }} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer active:scale-95 hover:border-blue-300">
                          <div><h4 className="font-black text-gray-900 text-sm">{u.name}</h4><p className="text-[10px] text-gray-500 font-bold">{u.phone} • {u.city}</p></div>
                          <div className="bg-green-50 text-green-700 text-[10px] font-black px-2 py-1 rounded">-{u.discount_percent || 0}% OFF</div>
                        </div>
                      ))
                    )}
                    
                    {!loading && filteredUsers.length > visibleUsersCount && (
                      <button onClick={() => setVisibleUsersCount(prev => prev + 20)} className="w-full py-4 bg-white border border-gray-200 text-blue-600 font-bold text-sm rounded-xl shadow-sm active:scale-95">Load More Users</button>
                    )}
                  </div>
                </>
              )}

             {createOrderStep === 'cart' && draftUser && (() => {
                const groupedDrafts = draftItems.reduce((acc, item, idx) => {
                  const pId = item.product.id;
                  if(!acc[pId]) {
                    acc[pId] = { product: item.product, name: item.product.name, img: safeParseJSON(item.product.img, {images:[]}).images[0] || '', items: [] };
                  }
                  acc[pId].items.push({ ...item, _originalIndex: idx });
                  return acc;
                }, {});

                return (
                <>
                  {(!draftUser.address || !draftUser.city || !draftUser.pincode) ? (
                     <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex justify-between items-center mb-4 shadow-sm">
                        <div>
                           <p className="text-[10px] font-bold text-red-600 uppercase">Action Required</p>
                           <h4 className="font-black text-red-900 text-xs mt-0.5">Delivery Address Missing</h4>
                        </div>
                        <button onClick={() => { setAddressForm({address: draftUser.address||'', city: draftUser.city||'', state: draftUser.state||'', pincode: draftUser.pincode||''}); setIsAddressSheetOpen(true); }} className="text-[10px] font-black text-white bg-red-600 px-3 py-1.5 rounded-lg active:scale-95 shadow-sm">Add Now</button>
                     </div>
                  ) : (
                     <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex justify-between items-start mb-4 shadow-sm">
                        <div>
                           <p className="text-[10px] font-bold text-gray-500 uppercase">Delivery Address</p>
                           <p className="font-bold text-gray-800 text-xs mt-0.5 leading-tight">{draftUser.address}, {draftUser.city}, {draftUser.state} - {draftUser.pincode}</p>
                        </div>
                        <button onClick={() => { setAddressForm({address: draftUser.address||'', city: draftUser.city||'', state: draftUser.state||'', pincode: draftUser.pincode||''}); setIsAddressSheetOpen(true); }} className="text-[10px] font-bold text-blue-600 underline shrink-0 ml-2">Edit</button>
                     </div>
                  )}

                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center mb-4 shrink-0">
                    <div><p className="text-[10px] font-bold text-blue-600 uppercase">Customer Selected</p><h4 className="font-black text-blue-900">{draftUser.name} <span className="text-[10px] text-blue-700">(-{draftUser.discount_percent || safeParseJSON(draftUser.meta, {})?.discount_percent || 0}%)</span></h4></div>
                    <button onClick={() => setCreateOrderStep('select_user')} className="text-[10px] font-bold text-blue-600 underline">Change</button>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest">Draft Items</h3>
                    <button onClick={() => setCreateOrderStep('add_item')} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg active:scale-95 border border-blue-100 flex items-center gap-1">
                      <Plus size={14} /> Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(groupedDrafts).map(([pId, group]: any) => (
                      <div key={pId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-3 items-center">
                          <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 p-0.5 shrink-0"><img src={group.img} className="w-full h-full object-cover rounded-md" alt="" /></div>
                          <h4 className="font-bold text-sm text-gray-900 truncate flex-1">{group.name}</h4>
                          <button onClick={() => {
                              setSelectedProductForAdd(group.product);
                              const sizes = safeParseJSON(group.product.meta, {})?.attributes?.available_sizes || {};
                              const initialConfig: any = {};
                              Object.keys(sizes).forEach(sz => { initialConfig[sz] = 0; });
                              group.items.forEach((ui:any) => { initialConfig[ui.size] = ui.qty; });
                              setAddSizeConfig(initialConfig);
                              setCreateOrderStep('add_item');
                          }} className="text-blue-600 bg-blue-50 p-1.5 rounded-md hover:bg-blue-100 active:scale-95"><Edit2 size={14}/></button>
                        </div>
                        
                        <div className="p-3 space-y-2">
                          {group.items.map((item: any) => {
                            const lineTotal = Number((item.rate * item.qty).toFixed(2));
                            return (
                            <div key={`draft-${item._originalIndex}`} className="flex justify-between items-center text-sm font-bold bg-[#F0FDF4] border border-[#BBF7D0] p-2 rounded-lg relative transition-all">
                              <span className="w-10 text-green-900">{item.size}</span>
                              <span className="w-12 text-center text-green-300">-</span>
                              <div className="w-20 flex justify-center">
                                 <input type="number" className="w-14 text-center bg-white border border-green-300 text-green-800 rounded-md py-1 outline-none font-black shadow-sm" 
                                    value={item.qty} 
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        const updated = [...draftItems];
                                        updated[item._originalIndex].qty = val;
                                        setDraftItems(updated);
                                    }} 
                                 />
                              </div>

                              <div className="flex items-center justify-end w-20 gap-1">
                               <div className="flex flex-col items-end">
                                 <span className="text-right text-green-800 shrink-0 leading-tight">₹{lineTotal}</span>
                                 <span className="text-[8px] text-gray-400 line-through">₹{item.product.mrp * item.qty}</span>
                               </div>
                               <button onClick={() => {
                                   const updated = draftItems.filter((_, idx) => idx !== item._originalIndex);
                                   setDraftItems(updated);
                               }} className="text-red-500 hover:bg-red-100 p-1.5 rounded-md ml-1 active:scale-95 transition-transform"><Trash2 size={14}/></button>
                            </div>

                            </div>
                          )})}
                        </div>
                      </div>
                    ))}
                    
                    {Object.keys(groupedDrafts).length === 0 && (
                       <button onClick={() => setCreateOrderStep('add_item')} className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 hover:bg-gray-50"><Plus size={16} /> Browse & Add Item</button>
                    )}
                  </div>
                </>
                );
              })()}

              {createOrderStep === 'add_item' && !selectedProductForAdd && (
                <>
                  {draftUser && <button onClick={() => setCreateOrderStep('cart')} className="mb-3 text-[10px] font-bold text-gray-500 flex items-center gap-1"><ChevronLeft size={14}/> Back to Cart</button>}
                  <input type="text" placeholder="Search product to add..." className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none" value={productSearchQuery} onChange={e => setProductSearchQuery(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {myProducts.filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase())).map(p => {
                      const imgData = safeParseJSON(p.img, {images:[]});
                      return (
                    <div key={p.id} onClick={() => {
                          setSelectedProductForAdd(p);
                          const sizes = safeParseJSON(p.meta, {})?.attributes?.available_sizes || {};
                          const initialConfig: any = {}; 
                          Object.keys(sizes).forEach(sz => { initialConfig[sz] = 0; });
                          setAddSizeConfig(initialConfig);
                        }} className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm cursor-pointer active:scale-95">
                          <img src={imgData.images[0] || ''} className="w-full h-24 object-cover rounded-lg mb-2 mix-blend-multiply" alt=""/>
                          <h4 className="font-bold text-xs text-gray-900 truncate">{p.name}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="font-black text-blue-600 text-[11px]">₹{p.cost}</p>
                            <p className="text-[9px] text-gray-400 line-through font-bold">₹{p.mrp}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {createOrderStep === 'add_item' && selectedProductForAdd && (() => {
                const targetUser = draftUser || selectedOrder || {};
                const productBoxSize = safeParseJSON(selectedProductForAdd?.meta, {})?.attributes?.box_size?.[0] || 6;

                return (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <button onClick={() => setSelectedProductForAdd(null)} className="text-[10px] font-bold text-gray-500 flex items-center gap-1 mb-2"><ChevronLeft size={14}/> Back to Products</button>
                    <h4 className="font-black text-lg text-gray-900 leading-tight">{selectedProductForAdd.name}</h4>
                    
                    {Object.keys(addSizeConfig).map(size => {
                      const finalRate = calculateFinalRate(selectedProductForAdd, size, targetUser);

                      return (
                        <div key={size} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                          <div>
                             <p className="font-black text-gray-900 text-base">{size}</p>
                             <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                Final Rate: ₹{finalRate.toFixed(2)} 
                                <span className="text-[9px] text-gray-400 line-through">₹{selectedProductForAdd.mrp}</span>
                             </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => setAddSizeConfig((prev:any) => ({...prev, [size]: Math.max(0, prev[size] - productBoxSize)}))} className="w-8 h-8 rounded-full bg-gray-100 font-bold active:scale-95 hover:bg-gray-200">-</button>
                            <span className="font-black text-lg w-4 text-center">{addSizeConfig[size]}</span>
                            <button onClick={() => setAddSizeConfig((prev:any) => ({...prev, [size]: prev[size] + productBoxSize}))} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold active:scale-95 hover:bg-blue-100">+</button>
                          </div>
                        </div>
                      )
                    })}

                    <button onClick={() => {
                      let updatedList = draftUser ? [...draftItems] : [...newOrderItems];
                      updatedList = updatedList.filter(item => item.product.id !== selectedProductForAdd.id);
                      
                      Object.keys(addSizeConfig).forEach(size => {
                        if (addSizeConfig[size] > 0) {
                          updatedList.push({ product: selectedProductForAdd, size: size, qty: addSizeConfig[size], rate: calculateFinalRate(selectedProductForAdd, size, targetUser) });
                        }
                      });

                      if (Object.keys(addSizeConfig).every(sz => addSizeConfig[sz]===0)) return showToast("Select at least 1 quantity!");

                      if (draftUser) { setDraftItems(updatedList); setCreateOrderStep('cart'); } 
                      else { setNewOrderItems(updatedList); setIsCreateOrderOpen(false); showToast("Items added! Tap 'Save Updates' below."); }
                      setSelectedProductForAdd(null);
                    }} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-4 active:scale-95 shadow-md">Confirm & Add</button>
                  </div>
                );
              })()}
            </div>

            {createOrderStep === 'cart' && draftItems.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-200 shrink-0">
               <button onClick={async () => {
                    if(!draftUser.address || !draftUser.city || !draftUser.pincode) {
                        return showToast("Please add delivery address first! 📍");
                    }

                    setIsSavingOrder(true);
                    try {
                      let totalAmt = 0; 
                      let totalBoxes = 0; 
                      let totalPcs = 0;
                      
                      draftItems.forEach(i => {
                         totalAmt += (i.qty * i.rate);
                         const boxSize = safeParseJSON(i.product.meta, {})?.attributes?.box_size?.[0] || 6;
                         totalBoxes += Math.ceil(i.qty / boxSize);
                         totalPcs += i.qty;
                      });
                      totalAmt = Math.round(totalAmt);

                      const { data: newOrder, error } = await supabase.from('orders').insert({
                          userid: draftUser.id, amount: totalAmt, finalAmount: totalAmt, status: 'Confirmed', 
                          created_by: currentUser.id, city: draftUser.city, state: draftUser.state, 
                          address: draftUser.address, pincode: draftUser.pincode, phone: draftUser.phone, 
                          box: totalBoxes, pcs: totalPcs,
                          meta: JSON.stringify({ expectedDispatch: '', sellerName: currentUser.name })
                      }).select().single();
                      if(error) throw error;

                      const inserts = draftItems.map(item => {
                          const boxSize = safeParseJSON(item.product.meta, {})?.attributes?.box_size?.[0] || 6;
                          return {
                              orderid: newOrder.id, productid: item.product.id, size: item.size, qty: item.qty, remainingQty: item.qty, rate: item.rate, 
                              userid: draftUser.id,
                              box: Math.ceil(item.qty / boxSize),
                              meta: JSON.stringify({ name: item.product.name, img: safeParseJSON(item.product.img, {images:[]}).images[0] || '', mrp: item.product.mrp })
                          }
                      });
                      await supabase.from('order_details').insert(inserts);
                      showToast("Order Created Successfully! 🎉"); setIsCreateOrderOpen(false); setDraftItems([]); setDraftUser(null); fetchOrders(); setView('orders');
                    } catch (e: any) { alert(e.message); } finally { setIsSavingOrder(false); }
                 }} className="w-full bg-[#008A00] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 shadow-[0_8px_20px_rgba(0,138,0,0.3)]">
                   {isSavingOrder ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} PLACE ORDER (₹{Math.round(draftItems.reduce((acc, i) => acc + (i.qty * i.rate), 0))})
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 🌟 BOTTOM SHEET: CUSTOMER ADDRESS ── */}
      {isAddressSheetOpen && (
        <div className="fixed inset-0 z-[7000] flex justify-end flex-col print-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddressSheetOpen(false)}></div>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-[2rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl flex flex-col">
            
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2"><MapPin size={18} className="text-blue-600"/> Delivery Address</h3>
              <button onClick={() => setIsAddressSheetOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={16}/></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Full Address / Shop Name</label>
                <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:border-blue-500 outline-none h-20" placeholder="Shop No, Street, Landmark..." value={addressForm.address} onChange={e => setAddressForm({...addressForm, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">City</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:border-blue-500 outline-none" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Pincode</label>
                  <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-black focus:border-blue-500 outline-none" 
                    value={addressForm.pincode} 
                    onChange={async (e) => {
                      const val = e.target.value;
                      setAddressForm(prev => ({...prev, pincode: val}));
                      
                      // 🌟 FIX: Auto Fetch City & State API
                      if(val.length === 6) {
                        try {
                          const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                          const data = await res.json();
                          if(data && data[0].Status === 'Success') {
                            const postOffice = data[0].PostOffice[0];
                            setAddressForm(prev => ({
                              ...prev, 
                              city: postOffice.District || postOffice.Block, 
                              state: postOffice.State
                            }));
                            showToast("City & State auto-filled! 📍");
                          } else {
                            showToast("Invalid Pincode ❌");
                          }
                        } catch(err) { console.log(err); }
                      }
                    }} 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">State</label>
                <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:border-blue-500 outline-none" value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} />
              </div>
              
              <button 
                onClick={async () => {
                  if(!addressForm.address || !addressForm.city || !addressForm.state || !addressForm.pincode) return showToast("Fill all details!");
                  setIsSavingAddress(true);
                  try {
                    await supabase.from('users').update(addressForm).eq('id', draftUser.id);
                    setDraftUser({...draftUser, ...addressForm});
                    setUsersList(prev => prev.map(u => u.id === draftUser.id ? {...u, ...addressForm} : u));
                    setIsAddressSheetOpen(false);
                    showToast("Address Saved Successfully! ✅");
                  } catch(e: any) { alert(e.message); } finally { setIsSavingAddress(false); }
                }} 
                disabled={isSavingAddress}
                className="w-full mt-2 bg-gray-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-md active:scale-95 flex justify-center items-center gap-2"
              >
                {isSavingAddress ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSavingAddress ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      {view !== 'order_detail' && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white border-t border-gray-200 flex justify-around py-3 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.03)] pb-safe print-hidden">
          <button onClick={() => setView('dashboard')} className="p-1.5 flex flex-col items-center gap-1"><LayoutDashboard className={view === 'dashboard' ? 'text-blue-600 scale-110' : 'text-gray-400'} size={20} /><span className={`text-[9px] font-bold ${view === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>Dashboard</span></button>
          <button onClick={() => setView('orders')} className="p-1.5 flex flex-col items-center gap-1"><ClipboardList className={view === 'orders' ? 'text-blue-600 scale-110' : 'text-gray-400'} size={20} /><span className={`text-[9px] font-bold ${view === 'orders' ? 'text-blue-600' : 'text-gray-400'}`}>Orders</span></button>
          <button onClick={() => setView('users')} className="p-1.5 flex flex-col items-center gap-1 -mt-4"><div className="bg-gray-900 text-white p-3 rounded-full shadow-lg border-2 border-white active:scale-95"><Users size={22} /></div><span className={`text-[9px] font-bold ${view === 'users' ? 'text-gray-900' : 'text-gray-400'}`}>Users</span></button>
          <button onClick={() => setView('products')} className="p-1.5 flex flex-col items-center gap-1"><Package className={view === 'products' ? 'text-blue-600 scale-110' : 'text-gray-400'} size={20} /><span className={`text-[9px] font-bold ${view === 'products' ? 'text-blue-600' : 'text-gray-400'}`}>Listings</span></button>
        </nav>
      )}
    </div>
  );
}