// @ts-nocheck
/* eslint-disable */
"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ShoppingCart, Home, User, ChevronLeft, Search, Loader2, 
  Plus, Trash2, X, Truck, SlidersHorizontal, ArrowDownUp, 
  Edit2, UploadCloud, CheckCircle2, LogOut, MapPin, Phone,
  ClipboardList, Navigation, AlertCircle, Ban, Package, Download,
  Bell, Smartphone
} from 'lucide-react';

const safeParseJSON = (data: any, fallback: any) => {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try { return JSON.parse(data); } catch (e) { return fallback; }
};

const getLocalTimestamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

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

// 🌟 THEME COLORS
const theme = {
  primary: '#FF3F6C', // Hot Pink
  primaryHover: '#E11B4C',
  textDark: '#282C3F', // Navy Dark
  success: '#03A685',
  offer: '#FF905A'
};

export default function NayikaNaariApp() {
  const router = useRouter();
  const [view, setView] = useState('splash'); 
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const [cart, setCart] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState(''); 
  
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [signupData, setSignupData] = useState({ name: '', phone: '', password: '', pincode: '', city: '', state: '', address: '' });
  const [addressData, setAddressData] = useState({ name: '', mobile: '', pincode: '', address: '', city: '', state: '' });
  
  const [zoomOverlay, setZoomOverlay] = useState<{images: string[], currentIndex: number} | null>(null);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
 const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All'); // Kept for safe fallback
  const [activeSheet, setActiveSheet] = useState<'none' | 'address' | 'sizes'>('none');

  // 🌟 NAYA: Filter & Sort States
  const [quickFilter, setQuickFilter] = useState('All');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('Price');
  const [appliedFilters, setAppliedFilters] = useState({ subcategories: [], sellers: [], priceRanges: [] });
  const [tempFilters, setTempFilters] = useState({ subcategories: [], sellers: [], priceRanges: [] });
  const [orderedProductIds, setOrderedProductIds] = useState<Set<number>>(new Set());
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderProgress, setOrderProgress] = useState(0);

  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [plpScrollPos, setPlpScrollPos] = useState(0);
  const [shakeBanner, setShakeBanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  // 🌟 LOCAL NOTIFICATION STATES
  const [localNotifs, setLocalNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // 🌟 NEW MULTI-SELLER STATES
  const [activeCartSeller, setActiveCartSeller] = useState<string | null>(null);
  const [sellerMovs, setSellerMovs] = useState<Record<string, number>>({});
  const [isSellerSheetOpen, setIsSellerSheetOpen] = useState(false);

  useEffect(() => {
    const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(checkIOS);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) setIsAppInstalled(true);

    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      showToast("App Installed Successfully!");
    });
    
    const savedNotifs = localStorage.getItem('nayika_naari_notifs');
    if (savedNotifs) setLocalNotifs(JSON.parse(savedNotifs));
    const unread = localStorage.getItem('nayika_naari_unread');
    if (unread) setUnreadCount(Number(unread));
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      const updateTracking = async () => {
        try {
          const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isAndroid = /Android/.test(navigator.userAgent);
          const deviceType = isApple ? 'iOS' : isAndroid ? 'Android' : 'Web';

          const existingMeta = typeof currentUser.meta === 'string' ? safeParseJSON(currentUser.meta, {}) : (currentUser.meta || {});
          
          await supabase.from('users').update({ 
            meta: { ...existingMeta, device: deviceType, lastSeen: new Date().toISOString() } 
          }).eq('id', currentUser.id);
        } catch (e) { console.error("Tracking error", e); }
      };
      
      updateTracking();

      let lastUpdate = Date.now();
      const handleInteract = () => {
        if (Date.now() - lastUpdate > 300000) { 
           lastUpdate = Date.now();
           updateTracking();
        }
      };

      window.addEventListener('scroll', handleInteract, {passive:true});
      window.addEventListener('click', handleInteract, {passive:true});
      return () => { window.removeEventListener('scroll', handleInteract); window.removeEventListener('click', handleInteract); }
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.OneSignal) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      document.head.appendChild(script);

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.init({
          appId: "b9f1d3d8-7879-4e3a-88ee-4296899e5256", 
          safari_web_id: "web.onesignal.auto.6a76584b-4903-4cb9-b550-82d6a06974fc",
          notifyButton: { enable: false }, 
        });
        
        const optedIn = await OneSignal.User.PushSubscription.optedIn;
        setIsPushEnabled(optedIn);

        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
          const notif = event.notification;
          const newAlert = {
              id: notif.notificationId || Date.now().toString(),
              title: notif.title || "New Alert",
              body: notif.body || "",
              url: notif.launchURL || "",
              date: new Date().toISOString(),
              isRead: false
          };

          setLocalNotifs((prev: any[]) => {
              const updated = [newAlert, ...prev];
              localStorage.setItem('nayika_naari_notifs', JSON.stringify(updated));
              return updated;
          });

          setUnreadCount((prev: number) => {
              const newCount = prev + 1;
              localStorage.setItem('nayika_naari_unread', newCount.toString());
              return newCount;
          });
        });

        OneSignal.User.PushSubscription.addEventListener("change", async (subscription: any) => {
          if (subscription.current.optedIn) {
            setIsPushEnabled(true);
            const token = subscription.current.id; 
            if (token && currentUser) {
              const { error } = await supabase.from('users').update({ push_token: token }).eq('id', currentUser.id);
              if (!error) {
                setCurrentUser({...currentUser, push_token: token});
              }
            }
          } else {
            setIsPushEnabled(false);
          }
        });
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        setInterval(() => reg.update(), 60000);
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              newSW.postMessage('SKIP_WAITING');
            }
          });
      });
      }).catch(err => console.log('SW failed:', err));
    } 
  }, []); 

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); 
      setDeferredPrompt(e);
      setShowInstallBanner(true); 
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSHint(true);
      setTimeout(() => setShowIOSHint(false), 5000);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      showToast("Install option not available in this browser.");
    }
  };

  const handleEnableNotifications = async () => {
    if (isIOS && !isAppInstalled) {
      alert("Apple requires you to Install the App (Step 1) before enabling notifications.");
      return;
    }

    try {
      const OneSignal = (window as any).OneSignal;
      if (!OneSignal) { showToast("Please wait a moment while the notification service loads."); return; }

      await OneSignal.Notifications.requestPermission();

      if (window.Notification && Notification.permission === "granted") {
        setIsPushEnabled(true);
        setTimeout(async () => {
          const subId = await OneSignal.User.PushSubscription.id;
          if (subId && currentUser) {
             await supabase.from("users").update({ push_token: subId }).eq("id", currentUser.id);
             setCurrentUser({...currentUser, push_token: subId});
             showToast("Notifications Enabled!");
          }
        }, 2000);
      } else {
        showToast("Notifications blocked! Please check browser settings.");
      }
    } catch (e) { console.error("Push enable error:", e); }
  };

  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handleBackButton = () => {
      if (zoomOverlay) {
        setZoomOverlay(null);
        window.history.pushState(null, '', window.location.href);
      } else if (activeSheet !== 'none') {
        setActiveSheet('none');
        window.history.pushState(null, '', window.location.href);
      } else if (isSellerSheetOpen) {
        setIsSellerSheetOpen(false);
        window.history.pushState(null, '', window.location.href);
      } else if (view === 'pdp' || view === 'cart' || view === 'orders' || view === 'profile' || view === 'notifications') {
        setView('plp');
        window.history.pushState(null, '', window.location.href);
      } else if (view === 'order_detail') {
        setView('orders');
        window.history.pushState(null, '', window.location.href);
      } else if (view === 'login_password' || view === 'signup') {
        setView('auth_phone');
        window.history.pushState(null, '', window.location.href);
      } else {
        window.history.back();
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [view, activeSheet, zoomOverlay, isSellerSheetOpen]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const loadDBCart = async (userId: number) => {
    const { data } = await supabase.from('cart_items').select('*, products(*)').eq('user_id', userId).eq('status', 0);
    if (data && data.length > 0) {
      const rebuiltCart = data.map((item: any) => {
        const p = item.products;
        const meta = safeParseJSON(p.meta, {});
        const sizesRaw = meta?.attributes?.available_sizes || {};
        const boxSize = meta?.attributes?.box_size?.[0] || 6;
        const imgData = safeParseJSON(p.img, { images: [] });
        const extraPrice = sizesRaw[item.size]?.extra_price || 0;

        return {
          ...p,
          cartId: `${p.id}-${item.size}`,
          selectedSize: item.size,
          qtyPieces: item.qty,
          boxSize: boxSize,
          unitPrice: p.cost + extraPrice,
          totalLineCost: item.qty * (p.cost + extraPrice),
          displayImg: imgData.images[0] || '',
          seller: item.seller || p.seller,
          updated_at: item.updated_at
        };
      });
      setCart(rebuiltCart);
    } else {
      setCart([]);
    }
  };

  const syncGuestCartToDB = async (userId: number) => {
    const guestCartStr = localStorage.getItem('nayika_naari_guest_cart');
    if (guestCartStr) {
      const guestCart = JSON.parse(guestCartStr);
      if (guestCart.length > 0) {
        const dbUpsertData = guestCart.map((item: any) => ({
          user_id: userId, product_id: item.id, size: item.selectedSize,
          qty: item.qtyPieces, status: 0, seller: item.seller || null, updated_at: getLocalTimestamp()
        }));
        await supabase.from('cart_items').upsert(dbUpsertData, { onConflict: 'user_id, product_id, size, status' });
      }
      localStorage.removeItem('nayika_naari_guest_cart');
    }
  };

  const handleDirectOrderLink = async (orderId: string, userId: number) => {
    setLoading(true);
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (order && order.userid === userId) {
       setSelectedOrder(order);
       const { data: items } = await supabase.from('order_details').select('*').eq('orderid', order.id);
       setOrderItems(items ? items.map(item => ({...item, meta: safeParseJSON(item.meta, {})})) : []);
       setView('order_detail');
    } else {
       setView('plp');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (view === 'splash') {
      setTimeout(() => {
        const savedUser = localStorage.getItem('nayika_naari_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setCurrentUser(parsedUser);
          setAddressData({ name: parsedUser.name, mobile: parsedUser.phone, pincode: parsedUser.pincode, address: parsedUser.address, city: parsedUser.city, state: parsedUser.state });
          loadDBCart(parsedUser.id);
          
          const urlParams = new URLSearchParams(window.location.search);
          const targetView = urlParams.get('view');
          const targetOrderId = urlParams.get('order_id');

          if (targetView === 'order_detail' && targetOrderId) {
             handleDirectOrderLink(targetOrderId, parsedUser.id);
          } else {
             setView('plp');
          }
        } else { 
          const guestCart = localStorage.getItem('nayika_naari_guest_cart');
          if (guestCart) setCart(JSON.parse(guestCart));
          setView('auth_phone'); 
        }
      }, 2500);
    }
  }, [view]);

  // 🌟 SELLER CART LOGIC
  const cartSellers = useMemo(() => {
    const sellersMap = new Map();
    cart.forEach(item => {
        const seller = item.seller || 'Nayika Naari';
        if (!sellersMap.has(seller)) {
            sellersMap.set(seller, { name: seller, latest: item.updated_at || '' });
        } else {
            if (item.updated_at > sellersMap.get(seller).latest) {
                sellersMap.set(seller, { name: seller, latest: item.updated_at });
            }
        }
    });
    return Array.from(sellersMap.values()).sort((a, b) => b.latest.localeCompare(a.latest)).map(s => s.name);
  }, [cart]);

  useEffect(() => {
      if (cartSellers.length > 0 && (!activeCartSeller || !cartSellers.includes(activeCartSeller))) {
          setActiveCartSeller(cartSellers[0]);
      } else if (cartSellers.length === 0) {
          setActiveCartSeller(null);
      }
  }, [cartSellers, activeCartSeller]);

  useEffect(() => {
      const fetchMovs = async () => {
          if (cartSellers.length > 0) {
              const { data } = await supabase.from('users').select('name, mov').in('name', cartSellers);
              const movs: Record<string, number> = {};
              cartSellers.forEach(s => movs[s] = 2500); 
              if (data) {
                  data.forEach((u: any) => {
                      movs[u.name] = u.mov !== null ? u.mov : 2500;
                  });
              }
              setSellerMovs(movs);
          }
      };
      fetchMovs();
  }, [cartSellers]);

  const activeCartItems = useMemo(() => {
      return cart.filter(item => (item.seller || 'Nayika Naari') === activeCartSeller);
  }, [cart, activeCartSeller]);

  const groupedCart = useMemo(() => {
    const groups: Record<number, any> = {};
    activeCartItems.forEach(item => {
      const meta = safeParseJSON(item.meta, {});
      const sizesRaw = meta?.attributes?.available_sizes || {};
      const isOOS = sizesRaw[item.selectedSize]?.is_active === false;

      if (!groups[item.id]) groups[item.id] = { productRef: item, id: item.id, name: item.name, subcategory: item.subcategory, displayImg: item.displayImg, totalPrice: 0, totalPcs: 0, totalBoxes: 0, sizesMap: {}, oosSizes: [] };

      groups[item.id].sizesMap[item.selectedSize] = item.qtyPieces;
      
      if (isOOS) {
          groups[item.id].oosSizes.push(item.selectedSize);
      } else {
          groups[item.id].totalPcs += item.qtyPieces;
          groups[item.id].totalBoxes += Math.ceil(item.qtyPieces / item.boxSize);
          groups[item.id].totalPrice += item.totalLineCost;
      }
    });
    return Object.values(groups);
  }, [activeCartItems]);

  const cartTotalAmount = groupedCart.reduce((a, b) => a + b.totalPrice, 0);
  const minOrderVal = sellerMovs[activeCartSeller || 'Nayika Naari'] || 2500;
  const isMovMet = cartTotalAmount >= minOrderVal;
  const shippingCharge = 100;

const processTruckUpdate = (baseProduct: any) => {
    const meta = safeParseJSON(baseProduct.meta, {});
    const sizesRaw = meta?.attributes?.available_sizes || {};
    const boxSize = meta?.attributes?.box_size?.[0] || 6;
    const imgData = safeParseJSON(baseProduct.img, { images: [] });
    const newItems: any[] = [];
    
    // 🌟 FIX: timestamp wapas add kar diya hai
    const timestamp = getLocalTimestamp();
    
    for (const [size, qty] of Object.entries(sizeQuantities)) {
      // 🌟 FIX: Do not process OOS sizes to save in cart
      const isOOS = sizesRaw[size]?.is_active === false;
      if (qty > 0 && !isOOS) {
        const extra = sizesRaw[size]?.extra_price || 0;
        newItems.push({
          ...baseProduct,
          cartId: `${baseProduct.id}-${size}`,
          selectedSize: size,
          qtyPieces: qty,
          boxSize: boxSize,
          unitPrice: baseProduct.cost + extra,
          totalLineCost: qty * (baseProduct.cost + extra),
          displayImg: imgData.images[0] || '',
          seller: baseProduct.seller || 'Nayika Naari',
          updated_at: timestamp
        });
      }
    }
    return newItems;
  };

  useEffect(() => {
    if (view === 'plp') {
      const scrollContainer = document.getElementById('main-scroll');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = plpScrollPos;
        }, 10);
      }
    }
  }, [view]);

  useEffect(() => {
    async function getProducts() {
      if (view === 'plp' && products.length === 0) {
        setLoading(true);
        const { data } = await supabase.from('products').select('*').order('id', { ascending: false });
        setProducts(data || []);
        setLoading(false);
      }
    }
    getProducts();
  }, [view]);

  useEffect(() => {
    if (currentUser && view === 'orders') {
      fetchMyOrders();
    }
  }, [currentUser, view]);

  useEffect(() => {
    if (currentUser && view === 'plp') { 
      const setupDone = localStorage.getItem("nayika_naari_setup_done");
      if (setupDone === "true") return; 

      const timer = setTimeout(() => {
        const OneSignal = (window as any).OneSignal;
        const isSubbed = OneSignal?.User?.PushSubscription?.optedIn;
        if (!isSubbed || !isAppInstalled) setShowInstallBanner(true);
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [view, currentUser, isAppInstalled]); 

  useEffect(() => {
    if (isAppInstalled && isPushEnabled && showInstallBanner) {
      setTimeout(() => {
        setShowInstallBanner(false);
        localStorage.setItem("nayika_naari_setup_done", "true"); 
      }, 1500); 
    }
  }, [isAppInstalled, isPushEnabled, showInstallBanner]);
// 🌟 NAYA: Silently fetch ordered items for "Repeat Order" filter without freezing UI
  useEffect(() => {
    if (currentUser) {
       supabase.from('orders').select('id').eq('userid', currentUser.id).then(({data: oData}) => {
          if (oData && oData.length > 0) {
             supabase.from('order_details').select('productid').in('orderid', oData.map(o => o.id))
               .then(({data: dData}) => { if (dData) setOrderedProductIds(new Set(dData.map(d => d.productid))); });
          }
       });
    }
  }, [currentUser]);

  // 🌟 NAYA: Generate dynamic filter options to prevent app crash and keep it optimized
  const filterOptions = useMemo(() => {
    const subcats = [...new Set(products.map(p => p.subcategory).filter(Boolean))];
    const sellers = [...new Set(products.map(p => p.seller || 'Nayika Naari'))];
    const maxPrice = products.length > 0 ? Math.max(...products.map(p => p.cost || 0)) : 0;
    const upperLimit = Math.ceil(maxPrice / 50) * 50; 
    const prices = [];
    for (let i = 0; i < upperLimit; i += 50) { prices.push(`${i}-${i + 50}`); }
    return { subcats, sellers, prices };
  }, [products]);

  const toggleTempFilter = (type: 'subcategories' | 'sellers' | 'priceRanges', value: string) => {
     setTempFilters(prev => {
        const arr = prev[type] as string[];
        return { ...prev, [type]: arr.includes(value) ? arr.filter(item => item !== value) : [...arr, value] };
     });
  };
  const fetchMyOrders = async () => {
    setLoading(true);
    
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('userid', currentUser.id)
      .order('createdAt', { ascending: false });

    if (ordersError || !ordersData) {
      console.error("Error fetching orders:", ordersError);
      setMyOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = ordersData.map((o: any) => o.id);
    let detailsData: any[] = [];
    
    if (orderIds.length > 0) {
      const { data: d } = await supabase
        .from('order_details')
        .select('*')
        .in('orderid', orderIds);
      if (d) detailsData = d;
    }

    const mergedOrders = ordersData.map((order: any) => ({
      ...order,
      order_details: detailsData.filter(d => d.orderid === order.id)
    }));

    setMyOrders(mergedOrders);
    setLoading(false);
  };

  const openOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setView('order_detail');
    setLoading(true);
    
    const { data: items } = await supabase.from('order_details').select('*').eq('orderid', order.id);
    if (items && items.length > 0) {
      const parsedItems = items.map(item => ({...item, meta: safeParseJSON(item.meta, {})}));
      setOrderItems(parsedItems);
    } else {
      setOrderItems([]);
    }
    setLoading(false);
  };

  const cancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setIsCancelling(true);
    const { error } = await supabase.from('orders').update({status: 'Cancelled'}).eq('id', selectedOrder.id);
    if (!error) {
       setSelectedOrder({...selectedOrder, status: 'Cancelled'});
       showToast("Order Cancelled Successfully");
       
       const { data: adminUser } = await supabase.from('users').select('push_token').eq('phone', 9758008624).single();
       if (adminUser?.push_token) {
          sendPushNotification(
            adminUser.push_token, "Order Cancelled ❌", 
            `${currentUser.name} cancelled their Pending Order #${selectedOrder.id}.`, 
            `${window.location.origin}/?view=seller_orders` 
          );
       }
       
       fetchMyOrders();
    } else {
       alert("Failed to cancel order.");
    }
    setIsCancelling(false);
  };

  const uploadOrderScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    setIsUploadingScreenshot(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `screenshots/order_${selectedOrder.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      
      const currentMeta = safeParseJSON(selectedOrder.meta, {});
      currentMeta.screenshot_uploaded = data.publicUrl; 
      
      await supabase.from('orders').update({ meta: currentMeta }).eq('id', selectedOrder.id);
      setSelectedOrder({...selectedOrder, meta: currentMeta});
      showToast("Screenshot Uploaded Successfully!");

      const { data: adminUser } = await supabase.from('users').select('push_token').eq('phone', 9758008624).single();
      if (adminUser?.push_token) {
         sendPushNotification(
           adminUser.push_token, "Payment Proof Uploaded 💰", 
           `${currentUser.name} uploaded a screenshot for Order #${selectedOrder.id}. Please verify.`, 
           `${window.location.origin}/?view=seller_orders` 
         );
      }

      fetchMyOrders();
    } catch(err: any) {
      alert("Failed to upload screenshot: " + err.message);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handleTrackOrder = () => {
    if (!selectedOrder?.tracking) return;
    let url = selectedOrder.tracking.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  };

  const checkUserPhone = async () => {
    if (!/^\d{10}$/.test(authPhone)) return alert("Enter valid 10-digit mobile number.");
    setLoading(true);
    const { data } = await supabase.from('users').select('id, name').eq('phone', authPhone).single();
    setLoading(false);
    if (data) setView('login_password');
    else { setSignupData(prev => ({ ...prev, phone: authPhone })); setView('signup'); }
  };

  const handleLogin = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('phone', authPhone).eq('password', authPassword).single();
    setLoading(false);
    if (data) {
      setCurrentUser(data); 
      localStorage.setItem('nayika_naari_user', JSON.stringify(data));
      setAddressData({ name: data.name, mobile: data.phone, pincode: data.pincode, address: data.address, city: data.city, state: data.state });
      
      await syncGuestCartToDB(data.id);
      await loadDBCart(data.id);
      setView('plp');
    } else alert("Invalid Password!");
  };

  const handleSignup = async () => {
    if (!signupData.name || !signupData.password || !signupData.pincode || !signupData.address) {
      return alert("Please fill all fields.");
    }
    setLoading(true);
    const { data, error } = await supabase.from('users').insert([{ 
      name: signupData.name,
      phone: signupData.phone, 
      password: signupData.password,
      pincode: signupData.pincode,
      address: signupData.address,
      city: signupData.city,
      state: signupData.state
    }]).select().single();
    
    setLoading(false);
    if (data) {
      setCurrentUser(data); 
      localStorage.setItem('nayika_naari_user', JSON.stringify(data));
      await syncGuestCartToDB(data.id);
      await loadDBCart(data.id);
      setView('plp');
    } else alert("Registration failed!");
  };

  const handleUpdateAddress = async () => {
    if (!currentUser) return;
    setLoading(true); 
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: addressData.name,
          phone: addressData.mobile,
          pincode: addressData.pincode,
          address: addressData.address,
          city: addressData.city,
          state: addressData.state
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      const updatedUser = { 
        ...currentUser, 
        ...addressData,
        phone: addressData.mobile
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('nayika_naari_user', JSON.stringify(updatedUser));
      
      setActiveSheet('none');
      showToast("Address Updated ✅");
    } catch (e: any) {
      alert("Update failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nayika_naari_user');
    setCurrentUser(null);
    setCart([]);
    setAuthPhone('');
    setAuthPassword('');
    setView('auth_phone');
  };

  const fetchPincodeDetails = async (pin: string, isSignup: boolean) => {
    if (isSignup) setSignupData({ ...signupData, pincode: pin });
    else setAddressData({ ...addressData, pincode: pin });
    if (pin.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === 'Success') {
          const po = data[0].PostOffice[0];
          if (isSignup) setSignupData(p => ({ ...p, city: po.District, state: po.State }));
          else setAddressData(p => ({ ...p, city: po.District, state: po.State }));
        }
      } catch (e) {}
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // 1. Applied Bottom Sheet Filters
    if (appliedFilters.subcategories.length > 0) filtered = filtered.filter(p => appliedFilters.subcategories.includes(p.subcategory));
    if (appliedFilters.sellers.length > 0) filtered = filtered.filter(p => appliedFilters.sellers.includes(p.seller || 'Nayika Naari'));
    if (appliedFilters.priceRanges.length > 0) {
      filtered = filtered.filter(p => appliedFilters.priceRanges.some((range: string) => {
          const [min, max] = range.split('-').map(Number);
          return (p.cost || 0) >= min && (p.cost || 0) <= max;
      }));
    }

    // 2. Search Text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.subcategory && p.subcategory.toLowerCase().includes(q)));
    }

    // 3. Quick Pills Logic (Optimized array mutation)
    if (quickFilter === 'Repeat Order') {
       filtered = filtered.filter(p => orderedProductIds.has(p.id));
    } else if (quickFilter === 'Low Rate Item') {
       filtered.sort((a, b) => (a.cost || 0) - (b.cost || 0));
    } else if (quickFilter === 'New Items') {
       filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return filtered;
  }, [products, searchQuery, appliedFilters, quickFilter, orderedProductIds]);

  const updateQty = (size: string, delta: number, boxSize: number) => {
    setSizeQuantities(prev => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) + (delta * boxSize)) }));
  };

  const addToTruck = async () => {
    const newItems = processTruckUpdate(selectedProduct);
    if (newItems.length === 0) return alert("Select quantity first!");
    
    setIsAdding(true);

    if (currentUser) {
      const dbUpsertData = newItems.map(item => ({
        user_id: currentUser.id,
        product_id: item.id,
        size: item.selectedSize,
        qty: item.qtyPieces,
        status: 0,
        seller: item.seller, 
        updated_at: getLocalTimestamp()
      }));
      await supabase.from('cart_items').upsert(dbUpsertData, { onConflict: 'user_id, product_id, size, status' });
    }

    setTimeout(() => {
      const filteredCart = cart.filter(i => i.id !== selectedProduct.id);
      const updatedCart = [...filteredCart, ...newItems];
      setCart(updatedCart);
      
      if (!currentUser) localStorage.setItem('nayika_naari_guest_cart', JSON.stringify(updatedCart));
      
      setIsAdding(false); 
      showToast("Cart Updated");
      setView('cart');
    }, 800);
  };

  const handlePlaceOrderClick = () => {
    if (!currentUser) { alert("Please login to place an order."); setView('auth_phone'); return; }
    
    if (!addressData.name || !addressData.mobile || !addressData.pincode || !addressData.address || !addressData.city || !addressData.state) { 
      showToast("Please complete your delivery address first."); 
      setActiveSheet('address'); 
      return; 
    }
    
    if (!isMovMet) {
      setShakeBanner(true);
      setTimeout(() => setShakeBanner(false), 500); 
      return;
    }

    handlePlaceOrder();
  };

  const sendPushNotification = async (targetToken: string, title: string, message: string, url: string) => {
    if (!targetToken) return;
    try {
      await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Basic os_v2_app_xhy5hwdypfhdvchoiklithssky66nrwfhrkeoqvmiba3ekrjy6l74os35hmocacgqak2372msqja2433uywmuhcfyesyiwozn2o522y'
        },
        body: JSON.stringify({ 
          app_id: "b9f1d3d8-7879-4e3a-88ee-4296899e5256",
          include_player_ids: [targetToken], 
          headings: { en: title }, 
          contents: { en: message }, 
          url: url 
        })
      });
    } catch (e) {
      console.error("Frontend Push Trigger Error:", e);
    }
  };

  const handlePlaceOrder = async () => {
    if (activeCartItems.length === 0) return;
    setIsPlacingOrder(true); setOrderProgress(10);

    try {
      setOrderProgress(40);
      const totalPcs = groupedCart.reduce((a, b) => a + b.totalPcs, 0);
      const totalBoxes = groupedCart.reduce((a, b) => a + b.totalBoxes, 0);
      const orderAmount = cartTotalAmount; 

      const { data: order, error } = await supabase.from('orders').insert([{
        userid: currentUser.id, pincode: addressData.pincode, city: addressData.city, state: addressData.state,
        address: addressData.address, phone: addressData.mobile, box: totalBoxes, pcs: totalPcs,
        status: 'Pending', amount: orderAmount, finalAmount: orderAmount, advance: shippingCharge,
        meta: { screenshot_uploaded: false, sellerName: activeCartSeller }
      }]).select().single();

      if (error) throw error;
      setOrderProgress(60);

      const details = activeCartItems.map(i => {
        const meta = safeParseJSON(i.meta, {});
        const isOOS = meta?.attributes?.available_sizes?.[i.selectedSize]?.is_active === false;

        return {
          orderid: order.id, userid: currentUser.id, productid: i.id, size: i.selectedSize,
          box: Math.ceil(i.qtyPieces / i.boxSize), qty: i.qtyPieces, 
          remainingQty: isOOS ? 0 : i.qtyPieces, 
          rate: i.unitPrice, meta: { name: i.name, img: i.displayImg }
        }
      });
      await supabase.from('order_details').insert(details);
      
      setOrderProgress(80);

      for (const item of activeCartItems) {
         await supabase.from('cart_items')
           .update({ status: 1, updated_at: getLocalTimestamp() })
           .match({ user_id: currentUser.id, product_id: item.id, size: item.selectedSize, status: 0 });
      }

      setCart(prev => prev.filter(item => (item.seller || 'Nayika Naari') !== activeCartSeller));
      
      setOrderProgress(100);

      let msg = `*🚨 New Order Placed! (Order #${order.id})*\n*Seller:* ${activeCartSeller}\n\n*Name:* ${addressData.name}\n*Phone:* ${addressData.mobile}\n*City:* ${addressData.city}, ${addressData.state}\n\n*📦 ORDER DETAILS:*\n------------------------\n`;
      groupedCart.forEach((group, index) => { 
        msg += `*${index + 1}. ${group.name} (${group.subcategory})*\n`;
        Object.entries(group.sizesMap).forEach(([size, qtyPieces]: any) => {
           const boxSize = group.productRef.boxSize || 6;
           const boxes = Math.ceil(qtyPieces / boxSize);
           const isOOS = group.oosSizes.includes(size);
           msg += `• Size ${size} | ${boxes} Box (${qtyPieces} Pcs)${isOOS ? ' - OOS' : ''}\n`;
        });
        msg += `\n`;
      });
      
      msg += `------------------------\n*Total Amount:* ₹${orderAmount}/-`;
      if (shippingCharge > 0) {
        msg += `\n*Advance:* ₹${shippingCharge}/-`;
      }
      msg += `\n\n_Screenshot attached in app._`;
      
      const myWebsiteUrl = window.location.origin;
      if (currentUser?.push_token) {
         sendPushNotification(currentUser.push_token, "Order Placed Successfully! 🎉", `Hey ${addressData.name}, your order #${order.id} for ₹${orderAmount} has been sent.`, `${myWebsiteUrl}/?view=order_detail&order_id=${order.id}`);
      }

      const { data: adminUser } = await supabase.from('users').select('push_token').eq('phone', 9758008624).single();
      if (adminUser?.push_token) {
         sendPushNotification(adminUser.push_token, "New Order Received! 🛍️", `${addressData.name} placed Order #${order.id} for ₹${orderAmount}.`, `${myWebsiteUrl}/?view=seller_orders`);
      }

      setTimeout(() => {
        setIsPlacingOrder(false); setPaymentScreenshot(null);
        window.location.href = `https://wa.me/919758008624?text=${encodeURIComponent(msg)}`;
        setView('plp');
      }, 1000);
    } catch (e: any) { alert("Order Failed: " + e.message); setIsPlacingOrder(false); }
  };

  const openPDP = (product: any) => {
    const scrollContainer = document.getElementById('main-scroll');
    if (scrollContainer) setPlpScrollPos(scrollContainer.scrollTop);
    setSelectedProduct(product);
    
    setTimeout(() => {
      if (scrollContainer) scrollContainer.scrollTop = 0;
    }, 10);
    const existingQty: Record<string, number> = {};
    cart.forEach(item => { if (item.id === product.id) existingQty[item.selectedSize] = item.qtyPieces; });
    setSizeQuantities(existingQty); 
    setCurrentImgIndex(0); 
    setIsSearching(false); 
    setView('pdp');
  };

  // ==========================================
  // RENDERING 
  // ==========================================

if (view === 'splash') return (
    <div translate="no" className="w-full max-w-md mx-auto h-[100dvh] bg-white flex flex-col items-center justify-center relative shadow-2xl overflow-hidden">
      <img src="/splash.png" alt="Nayika Naari" className="absolute inset-0 w-full h-full object-contain z-0" />
      <div className="absolute bottom-12 z-10">
        <Loader2 className="animate-spin drop-shadow-md" color={theme.primary} size={32} />
      </div>
    </div>
  );

  if (view === 'auth_phone' || view === 'login_password' || view === 'signup') return (
    <div className="w-full max-w-md mx-auto bg-white h-[100dvh] flex flex-col p-6 shadow-2xl animate-in fade-in duration-300 justify-center border-x border-gray-100">
      <div className="mb-10">
        <h1 className="font-black text-3xl tracking-tighter text-center" style={{color: theme.primary}}>NAYIKA NAARI</h1>
        <div className="mt-8">
          {view === 'auth_phone' && <h2 className="font-bold text-xl" style={{color: theme.textDark}}>Enter Mobile Number</h2>}
          {view === 'login_password' && <h2 className="font-bold text-xl" style={{color: theme.textDark}}>Welcome Back!</h2>}
          {view === 'signup' && <h2 className="font-bold text-xl" style={{color: theme.textDark}}>Create an Account</h2>}
          <p className="text-sm text-gray-500 mt-1">
            {view === 'auth_phone' && "We'll check if you have an account."}
            {view === 'login_password' && "Enter your password to continue."}
            {view === 'signup' && "Fill your business details below."}
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {view === 'auth_phone' && (<input type="tel" maxLength={10} placeholder="10-digit Mobile Number" className="input-field" value={authPhone} onChange={e => setAuthPhone(e.target.value.replace(/\D/g,''))} />)}
        {view === 'login_password' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200"><span className="font-bold text-gray-600">+91 {authPhone}</span><button onClick={() => { setView('auth_phone'); setAuthPassword(''); }} style={{color: theme.primary}} className="text-xs font-bold underline">Change</button></div>
            <div className="flex items-center gap-3 w-full">
              <input 
                type="password" 
                placeholder="Enter Password" 
                className="input-field" 
                value={authPassword} 
                onChange={e => setAuthPassword(e.target.value)} 
              />
              <a
                href={`https://wa.me/919808332207?text=${encodeURIComponent(`${authPhone} - Please share my password`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold whitespace-nowrap cursor-pointer hover:opacity-80 active:scale-95"
                style={{ color: theme.primary }}
              >
                Forgot Password?
              </a>
            </div>
          </div>
        )}
       {view === 'signup' && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            <div className="p-3 bg-gray-50 border border-gray-200 text-sm font-bold text-gray-500 rounded">+91 {signupData.phone}</div>
            
            <input type="text" placeholder="Full Name" className="input-field" value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} />
            <input type="password" placeholder="Create Password" className="input-field" value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} />
            <input type="number" placeholder="Pincode" className="input-field" value={signupData.pincode} onChange={e => fetchPincodeDetails(e.target.value, true)} />
            
            {(signupData.city || signupData.state) && (
              <div className="px-1 flex gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400" translate="no">
                <span>{signupData.city}</span>
                {signupData.city && signupData.state && <span>•</span>}
                <span>{signupData.state}</span>
              </div>
            )}

            <textarea placeholder="Complete Address" className="input-field h-20" value={signupData.address} onChange={e => setSignupData({...signupData, address: e.target.value})} />
            <p className="text-[10px] text-gray-400 font-medium text-center">Verify your details before creating account.</p>
          </div>
        )}
      <button onClick={view === 'auth_phone' ? checkUserPhone : view === 'login_password' ? handleLogin : handleSignup} disabled={loading} style={{backgroundColor: theme.primary}} className="w-full text-white py-3.5 rounded font-bold uppercase tracking-widest text-[12px] shadow-sm mt-6 flex justify-center items-center active:scale-95 transition-transform gap-2">          
          {loading ? <Loader2 className="animate-spin" /> : view === 'auth_phone' ? 'Continue' : view === 'login_password' ? 'Login to Shop' : 'Create Account'}
        </button>
        {view === 'auth_phone' && <p className="text-center text-xs font-bold text-gray-400 mt-4 cursor-pointer" onClick={() => setView('plp')}>Skip & Browse as Guest</p>}
     {view === 'signup' && (
          <p className="text-center text-[11px] font-bold text-gray-500 mt-4 cursor-pointer" onClick={() => setView('auth_phone')}>
            Already have an account? <span style={{color: theme.primary}} className="underline decoration-2 underline-offset-2">Login</span>
          </p>
        )}
      </div>

      <div 
        className="fixed bottom-6 right-4 w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-[0_5px_20px_rgba(0,0,0,0.15)] cursor-pointer active:scale-95 transition-transform z-[9999] bg-white border border-gray-100"
        onClick={() => window.location.href = 'https://wa.me/919758008624?text=Hello Nayika Nari !'}
      >
        <svg height="66px" width="66px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 418.135 418.135" xmlSpace="preserve">
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
          <g id="SVGRepo_iconCarrier"> 
            <g> 
              <path style={{fill: "#7AD06D"}} d="M198.929,0.242C88.5,5.5,1.356,97.466,1.691,208.02c0.102,33.672,8.231,65.454,22.571,93.536 L2.245,408.429c-1.191,5.781,4.023,10.843,9.766,9.483l104.723-24.811c26.905,13.402,57.125,21.143,89.108,21.631 c112.869,1.724,206.982-87.897,210.5-200.724C420.113,93.065,320.295-5.538,198.929,0.242z M323.886,322.197 c-30.669,30.669-71.446,47.559-114.818,47.559c-25.396,0-49.71-5.698-72.269-16.935l-14.584-7.265l-64.206,15.212l13.515-65.607 l-7.185-14.07c-11.711-22.935-17.649-47.736-17.649-73.713c0-43.373,16.89-84.149,47.559-114.819 c30.395-30.395,71.837-47.56,114.822-47.56C252.443,45,293.218,61.89,323.887,92.558c30.669,30.669,47.559,71.445,47.56,114.817 C371.446,250.361,354.281,291.803,323.886,322.197z"></path> 
              <path style={{fill: "#7AD06D"}} d="M309.712,252.351l-40.169-11.534c-5.281-1.516-10.968-0.018-14.816,3.903l-9.823,10.008 c-4.142,4.22-10.427,5.576-15.909,3.358c-19.002-7.69-58.974-43.23-69.182-61.007c-2.945-5.128-2.458-11.539,1.158-16.218 l8.576-11.095c3.36-4.347,4.069-10.185,1.847-15.21l-16.9-38.223c-4.048-9.155-15.747-11.82-23.39-5.356 c-11.211,9.482-24.513,23.891-26.13,39.854c-2.851,28.144,9.219,63.622,54.862,106.222c52.73,49.215,94.956,55.717,122.449,49.057 c15.594-3.777,28.056-18.919,35.921-31.317C323.568,266.34,319.334,255.114,309.712,252.351z"></path> 
            </g> 
          </g>
        </svg>
      </div>

    </div>
  );
  return (
    <div className="w-full max-w-md mx-auto bg-white h-[100dvh] font-sans text-gray-900 shadow-2xl relative overflow-hidden flex flex-col border-x border-gray-100">
      
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full z-[5000] text-xs font-bold tracking-widest shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-green-400" />
          {toastMsg}
        </div>
      )}

      {showInstallBanner && (
        <div className="fixed inset-0 z-[6000] flex justify-end flex-col">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
          
          <div className="bg-white w-full max-w-[450px] mx-auto p-6 pb-10 rounded-t-[32px] relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

            <h3 className="font-black text-2xl text-gray-900 mb-2">Complete Setup</h3>
            <p className="text-sm text-gray-500 font-bold mb-8 leading-relaxed">
              For the best native experience and real-time alerts, please complete these steps.
            </p>

            <div className="flex flex-col gap-5">
              <div className={`p-4 rounded-2xl flex items-center gap-4 border-2 transition-all ${isAppInstalled ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isAppInstalled ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400 border border-gray-200'}`}>
                  <Smartphone size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-gray-900">Install App</h4>
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5 uppercase tracking-wider">Step 1 of 2</p>
                </div>
                {isAppInstalled ? (
                   <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-2 rounded-lg flex items-center gap-1"><CheckCircle2 size={14}/> Installed</span>
                ) : (
                   <button 
                    onClick={handleInstallClick} 
                    style={{backgroundColor: theme?.primary || '#000', color: '#FFF'}} 
                    className="text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl shadow-md active:scale-95 transition-transform"
                   >
                     Install
                   </button>
                )}
              </div>

              {showIOSHint && (
                <div className="bg-blue-50 text-blue-700 text-xs font-bold p-3 rounded-xl border border-blue-200 animate-in fade-in">
                  🍎 To install on iPhone: Tap the <b>Share</b> icon below and select <b>"Add to Home Screen"</b>.
                </div>
              )}

              <div className={`p-4 rounded-2xl flex items-center gap-4 border-2 transition-all ${isPushEnabled ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPushEnabled ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400 border border-gray-200'}`}>
                  <Bell size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-gray-900">Enable Alerts</h4>
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5 uppercase tracking-wider">Step 2 of 2</p>
                </div>
                {isPushEnabled ? (
                   <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-2 rounded-lg flex items-center gap-1"><CheckCircle2 size={14}/> Enabled</span>
                ) : (
                   <button 
                    onClick={handleEnableNotifications} 
                    style={{backgroundColor: theme?.primary || '#000', color: '#FFF'}} 
                    className="text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl shadow-md active:scale-95 transition-transform"
                   >
                     Allow
                   </button>
                )}
              </div>
            </div>

            <button 
              onClick={() => { setShowInstallBanner(false); localStorage.setItem('nayika_naari_setup_done', 'true'); }} 
              className="w-full flex justify-center items-center gap-1.5 text-gray-800 font-black text-xs uppercase tracking-[0.2em] mt-10 active:opacity-50"
            >
              <X size={16} strokeWidth={3} /> Skip for now
            </button>
          </div>
        </div>
      )}

      {zoomOverlay && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm">
          <button onClick={() => setZoomOverlay(null)} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full z-[2100] active:bg-white/20">
            <X size={24} />
          </button>
          
          {zoomOverlay.images.length > 1 && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest z-[2100]">
              {zoomOverlay.currentIndex + 1} / {zoomOverlay.images.length}
            </div>
          )}

          <div 
            className="relative w-full h-full flex items-center justify-center overflow-auto scrollbar-hide"
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dist = Math.hypot(
                  e.touches[0].clientX - e.touches[1].clientX,
                  e.touches[0].clientY - e.touches[1].clientY
                );
                e.currentTarget.dataset.pinchDist = dist.toString();
                
                const img = document.getElementById('zoomed-img');
                if (img) {
                  const currentScale = img.style.transform.match(/scale\(([^)]+)\)/)?.[1] || '1';
                  e.currentTarget.dataset.baseScale = currentScale;
                }
              } else if (e.touches.length === 1) {
                e.currentTarget.dataset.touchstartX = e.changedTouches[0].clientX.toString();
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2) {
                const startDist = parseFloat(e.currentTarget.dataset.pinchDist || '0');
                const baseScale = parseFloat(e.currentTarget.dataset.baseScale || '1');
                
                if (startDist > 0) {
                  const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  );
                  
                  let newScale = baseScale * (dist / startDist);
                  newScale = Math.min(Math.max(1, newScale), 4);
                  
                  const img = document.getElementById('zoomed-img');
                  if (img) img.style.transform = `scale(${newScale})`;
                }
              }
            }}
            onTouchEnd={(e) => {
              e.currentTarget.dataset.pinchDist = '0';
              if (e.changedTouches.length === 1) {
                const startX = parseFloat(e.currentTarget.dataset.touchstartX || '0');
                const endX = e.changedTouches[0].clientX;
                const diff = startX - endX;

                if (diff > 50 && zoomOverlay.currentIndex < zoomOverlay.images.length - 1) {
                  setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex + 1} : null);
                  const img = document.getElementById('zoomed-img');
                  if (img) img.style.transform = 'scale(1)'; 
                } 
                else if (diff < -50 && zoomOverlay.currentIndex > 0) {
                  setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex - 1} : null);
                  const img = document.getElementById('zoomed-img');
                  if (img) img.style.transform = 'scale(1)';
                }
              }
            }}
          >
            {zoomOverlay.currentIndex > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex - 1} : null); }} className="absolute left-4 p-3 bg-white/10 text-white rounded-full z-[2100] hover:bg-white/20 transition-colors hidden md:flex">
                <ChevronLeft size={28}/>
              </button>
            )}

            <div className="w-full max-w-md flex items-center justify-center p-2 min-h-full">
              <img 
                id="zoomed-img"
                src={zoomOverlay.images[zoomOverlay.currentIndex]} 
                className="w-full h-auto max-h-[85vh] object-contain transition-transform duration-75 origin-center cursor-zoom-in"
                alt="Zoomed" 
                onClick={(e) => {
                  e.stopPropagation();
                  const img = e.currentTarget;
                  const isZoomed = img.style.transform.includes('scale(2.5)');
                  img.style.transform = isZoomed ? 'scale(1)' : 'scale(2.5)';
                  img.style.transitionDuration = '300ms'; 
                  setTimeout(() => { img.style.transitionDuration = '50ms'; }, 300); 
                }}
              />
            </div>

            {zoomOverlay.currentIndex < zoomOverlay.images.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); setZoomOverlay(prev => prev ? {...prev, currentIndex: prev.currentIndex + 1} : null); }} className="absolute right-4 p-3 bg-white/10 text-white rounded-full z-[2100] rotate-180 hover:bg-white/20 transition-colors hidden md:flex">
                <ChevronLeft size={28}/>
              </button>
            )}
          </div>
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-bold tracking-widest uppercase pointer-events-none z-[2100]">
            Swipe • Tap to zoom
          </div>
        </div>
      )}

      {isPlacingOrder && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md mx-auto p-6 pt-8 pb-12 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl flex flex-col items-center">
             <div className="w-20 h-20 bg-[#FFE4EB] rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-sm relative">
                <Loader2 className="animate-spin absolute" color={theme.primary} size={40} strokeWidth={2.5} />
                <Truck color={theme.primary} size={20} />
             </div>
             <h3 className="font-black text-xl mb-1 text-gray-900">Processing your order</h3>
             <p className="text-sm text-gray-500 font-medium text-center mb-6 px-4 leading-relaxed">
               Please wait while we allocate your items.<br/>
               <span className="font-bold" style={{color: theme.primary}}>You will be redirected to WhatsApp shortly.</span>
             </p>
             
             <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden relative">
               <div className="h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${orderProgress}%`, backgroundColor: theme.success }}></div>
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{orderProgress}% Completed</p>
          </div>
        </div>
      )}

      {view !== 'profile' && (
        <header className="w-full px-4 py-3 bg-white sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 shadow-sm relative min-h-[60px]">
          {isSearching ? (
            <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-4 py-2 animate-in fade-in zoom-in-95 duration-200">
              <Search size={20} className="text-gray-400 mr-3 shrink-0" />
              <input 
                autoFocus type="text" placeholder="Search products..." 
                className="bg-transparent outline-none w-full text-sm font-bold placeholder:font-medium text-gray-800"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
              <X size={20} className="text-gray-500 cursor-pointer ml-2 shrink-0 bg-gray-200 rounded-full p-0.5" onClick={() => { setIsSearching(false); setSearchQuery(''); }} />
            </div>
          ) : (
            <>
              {view === 'plp' ? (
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 p-1.5 text-gray-600 rounded-md"><MapPin size={16}/></div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Deliver to</p>
                    <p className="text-[11px] font-bold leading-tight truncate w-24" style={{color: theme.textDark}} translate="no">
                      <span>{currentUser?.city || 'India'}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <button onClick={() => {
                  if (view === 'order_detail') setView('orders');
                  else setView('plp');
                }} className="p-1.5 bg-gray-50 hover:bg-gray-100 transition-colors rounded-md shrink-0 z-10 relative"><ChevronLeft size={20} /></button>
              )}
              
              {view === 'plp' ? (
                <div className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-32 h-full pointer-events-none">
                  <img src="/logo.png" alt="Nayika Naari" className="max-h-10 w-full object-contain" />
                </div>
              ) : 
               view === 'pdp' ? <h1 className="font-black text-lg text-center flex-1 truncate px-2" style={{color: theme.textDark}}>{selectedProduct?.name}</h1> : 
               view === 'orders' ? <h1 className="font-black text-[15px] tracking-widest text-center flex-1 absolute left-1/2 -translate-x-1/2" style={{color: theme.textDark}}>MY ORDERS</h1> :
               view === 'order_detail' ? <h1 className="font-black text-[15px] tracking-widest text-center flex-1 absolute left-1/2 -translate-x-1/2" style={{color: theme.textDark}}>ORDER #{selectedOrder?.id}</h1> :
               view === 'notifications' ? <h1 className="font-black text-[15px] tracking-widest text-center flex-1 absolute left-1/2 -translate-x-1/2" style={{color: theme.textDark}}>NOTIFICATIONS</h1> :
               <h1 className="font-black text-lg tracking-widest text-center flex-1">{view.toUpperCase()}</h1>}
               
              <div className="flex gap-2 shrink-0 ml-auto z-10 relative">
                {view === 'plp' && <div className="bg-gray-50 p-1.5 rounded-md cursor-pointer pointer-events-auto" onClick={() => setIsSearching(true)}><Search size={18} /></div>}
                
                {currentUser && (
                  <div className="bg-gray-50 p-1.5 relative cursor-pointer rounded-md pointer-events-auto" onClick={() => {
                     setView('notifications');
                     setUnreadCount(0);
                     localStorage.setItem('nayika_naari_unread', '0');
                  }}>
                    <Bell size={18} />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 text-white text-[9px] w-4 h-4 flex items-center justify-center font-bold border border-white rounded-full" style={{backgroundColor: theme.primary}}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </div>
                )}

                <div className="bg-gray-50 p-1.5 relative cursor-pointer rounded-md pointer-events-auto" onClick={() => setView('cart')}>
                  <ShoppingCart size={18} />
                  {cart.length > 0 && <span className="absolute -top-1 -right-1 text-white text-[9px] w-4 h-4 flex items-center justify-center font-bold border border-white rounded-full" style={{backgroundColor: theme.primary}}>{cart.length}</span>}
                </div>
              </div>
            </>
          )}
        </header>
      )}

      <main id="main-scroll" className="flex-1 flex flex-col w-full overflow-y-auto scrollbar-hide pb-[90px]">
        
        {view === 'notifications' && (
          <div className="animate-in fade-in duration-300 flex flex-col flex-1 bg-[#F5F5F6] relative p-4">
             {localNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                   <Bell size={50} className="mb-4 opacity-20" />
                   <p className="text-sm font-bold text-gray-500">No notifications yet.</p>
                   <p className="text-xs text-gray-400 mt-1">We'll alert you when there's an update.</p>
                </div>
             ) : (
                <div className="flex flex-col gap-3 pb-24">
                   {localNotifs.map((n, i) => (
                      <div key={n.id || i} onClick={() => {
                          const updated = localNotifs.map(x => x.id === n.id ? {...x, isRead: true} : x);
                          setLocalNotifs(updated);
                          localStorage.setItem('nayika_naari_notifs', JSON.stringify(updated));
                          
                          if (n.url && n.url.includes('view=order_detail')) {
                             const urlObj = new URL(n.url);
                             const oid = urlObj.searchParams.get('order_id');
                             if (oid && currentUser) handleDirectOrderLink(oid, currentUser.id);
                          } else if (n.url) {
                             window.location.href = n.url;
                          }
                      }} className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer active:scale-[0.98] transition-transform ${n.isRead ? 'border-gray-100 opacity-70' : 'border-gray-200'}`}>
                         <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm text-gray-900">{n.title}</h4>
                            {!n.isRead && <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{backgroundColor: theme.primary}}></div>}
                         </div>
                         <p className="text-[13px] text-gray-600 leading-relaxed mb-2">{n.body}</p>
                         <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{safeFormatDate(n.date)}</p>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}

        {view === 'plp' && (
          <div className="animate-in fade-in duration-500 bg-gray-100 flex-1 flex flex-col">
          {/* 🌟 NAYA: Dynamic Pills + Filters Button */}
           <div className="flex items-center gap-2 px-3 py-3 bg-white border-b border-gray-200 shrink-0 sticky top-0 z-30 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="flex overflow-x-auto gap-2 scrollbar-hide flex-1 pb-0.5">
                 {['All', 'Repeat Order', 'Low Rate Item', 'New Items'].map(qf => (
                   <button 
                     key={qf} 
                     onClick={() => setQuickFilter(qf)} 
                     className={`whitespace-nowrap px-4 py-1.5 text-[11px] font-bold border transition-all rounded-full ${quickFilter === qf ? 'text-white shadow-md border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`} 
                     style={quickFilter === qf ? {backgroundColor: theme.primary} : {}}
                   >
                     {qf}
                   </button>
                 ))}
              </div>
              
              <div className="w-[1px] h-6 bg-gray-200 mx-0.5 shrink-0"></div>
              
              <button 
                onClick={() => { 
                   setTempFilters(appliedFilters); 
                   setActiveFilterTab('Category'); 
                   setIsFilterSheetOpen(true); 
                }} 
                // 🌟 FIX: 'relative' class hata di taaki overlap na ho
                className="flex items-center justify-center gap-1.5 shrink-0 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-[11px] font-black active:bg-gray-100 uppercase tracking-wide transition-colors hover:border-gray-300"
              >
                 <SlidersHorizontal size={14} className="text-gray-500" /> 
                 <span>Filters</span>
                 
                 {/* 🌟 FIX: Badge ko absolute se hata kar normal flex flow mein daal diya text ke bagal mein */}
                 {(() => {
                    const filterCount = appliedFilters.subcategories.length + appliedFilters.sellers.length + appliedFilters.priceRanges.length;
                    if (filterCount > 0) return (
                       <span className="min-w-[16px] h-4 px-1 ml-0.5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm" style={{backgroundColor: theme.primary}}>
                         {filterCount}
                       </span>
                    );
                    return null;
                 })()}
              </button>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200 text-[11px] text-gray-500 font-medium shrink-0">
               <span>{filteredProducts.length} Products</span>
            </div>

            {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" color={theme.primary} size={32} /></div> : filteredProducts.length === 0 ? <p className="text-center text-gray-400 text-sm py-20 bg-white">No products found.</p> : (
              <div className="grid grid-cols-2 gap-[1px] bg-gray-200 border-b border-gray-200">
                {filteredProducts.map((p) => {
                  const imgData = safeParseJSON(p.img, { images: [] });
                  const metaData = safeParseJSON(p.meta, {});
                  const boxSize = metaData?.attributes?.box_size?.[0] || 6;
                  const categoryTag = p.subcategory && p.subcategory !== 'All' ? p.subcategory : "Trending";

                  return (
                    <div key={p.id} onClick={() => openPDP(p)} className="bg-white flex flex-col cursor-pointer hover:bg-gray-50 transition-colors pb-3 relative">
                      <div className="relative w-full aspect-[4/5] bg-gray-50 flex items-center justify-center p-1">
                        <img src={imgData.images[0]} className="w-full h-full object-cover rounded-md" alt={p.name} />
                        <div className="absolute bottom-1 left-1 bg-[#C8F7F4] text-[#006B65] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                          MOQ: {boxSize} Pcs
                        </div>
                        <div className="absolute bottom-1 right-1 bg-white text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">
                          {categoryTag}
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 px-2.5 pt-2.5">
                        <h4 className="font-bold text-[13px] text-gray-900 truncate leading-tight">{p.name}</h4>
                        
                        {/* 🌟 NAYA: Seller Pill */}
                        <div className="text-[9px] font-bold text-gray-500 mt-1 flex items-center gap-1">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Sold By: {p.seller || 'Nayika Naari'}</span>
                        </div>

                        <p className="text-[10px] text-gray-500 truncate mt-1">
                          {p.description ? p.description.replace(/\\n|\n/g, ' ') : ''}
                        </p>
                        <div className="mt-1.5 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-[15px] text-gray-900 leading-none">₹{p.cost}</p>
                            {p.mrp && p.mrp > p.cost && (
                              <>
                                <p className="text-[14px] text-gray-400 line-through font-medium leading-none">MRP ₹{p.mrp}</p>
                                <span className="text-[12px] font-bold leading-none tracking-tight" style={{color: theme.offer}}>
                                  ({p.discount ? `${p.discount}% OFF` : 'SALE'})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'pdp' && selectedProduct && (() => {
          const imgData = safeParseJSON(selectedProduct.img, { images: [] });
          const metaData = safeParseJSON(selectedProduct.meta, {});
          const sizesRaw = metaData?.attributes?.available_sizes || {};
          
          const sizes = Array.isArray(sizesRaw) 
             ? sizesRaw 
             : Object.keys(sizesRaw).filter(s => sizesRaw[s].is_active !== false);

          const getExtraPrice = (s: string) => Array.isArray(sizesRaw) ? 0 : (sizesRaw[s]?.extra_price || 0);
          const boxSize = metaData?.attributes?.box_size?.[0] || 6;
          
          let currentTotal = 0;
          for (const [size, qtyPieces] of Object.entries(sizeQuantities)) {
            if (qtyPieces > 0) currentTotal += qtyPieces * (selectedProduct.cost + getExtraPrice(size));
          }

          const descLines = selectedProduct.description ? selectedProduct.description.split(/\\n|\n/).filter((l: string) => l.trim() !== "") : [];

          return (
            <div className="animate-in slide-in-from-right duration-300 pb-[80px] bg-[#F8F9FA] flex-1 relative">
              
              <div className="bg-white relative shadow-sm border-b border-gray-200">
                 <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-bold z-10">
                   {currentImgIndex + 1} / {imgData.images.length}
                 </div>
                 <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" onScroll={e => setCurrentImgIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
                   {imgData.images.map((img: string, idx: number) => (
                     <div key={idx} onClick={() => setZoomOverlay({images: imgData.images, currentIndex: idx})} className="snap-center shrink-0 w-full h-[250px] flex items-center justify-center cursor-zoom-in bg-white p-2">
                       <img src={img} className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply" alt="Product" />
                     </div>
                   ))}
                 </div>
              </div>

              <div className="bg-white border-b border-gray-200 flex flex-col">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <p className="text-[26px] font-black text-gray-900 leading-none">₹{selectedProduct.cost}</p>
                    {selectedProduct.mrp && selectedProduct.mrp > selectedProduct.cost && (
                      <div className="flex flex-col justify-center mt-1">
                        <p className="text-[14px] text-gray-400 line-through font-bold leading-none">MRP ₹{selectedProduct.mrp}</p>
                        <span className="bg-[#E5F7ED] text-[#008A00] px-1 py-[2px] rounded text-[12px] font-black tracking-wider leading-none mt-1 w-fit">
                          {selectedProduct.discount}% OFF
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-md font-bold border border-gray-200">
                    MOQ: {boxSize} Pcs
                  </div>
                </div>

                {descLines.length > 0 && (
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-[#FAFAFA]">
                    <ul className="text-[11px] font-bold text-gray-700 leading-snug grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {descLines.map((line: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span style={{color: theme.primary}} className="text-[13px] leading-none mt-[1px]">•</span> 
                          <span className="truncate">{line.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <div className="px-4 pt-4 pb-2"><h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Select Sizes</h3></div>
                  {sizes.length === 0 && <p className="p-4 text-center text-gray-400 text-xs font-medium">No sizes available right now.</p>}
                  {sizes.map((size: string, index: number) => {
                    const extraPrice = getExtraPrice(size);
                    const qtyPieces = sizeQuantities[size] || 0;
                    const isSelected = qtyPieces > 0;
                    return (
                      <div key={size} className={`flex justify-between items-center py-3 px-4 mx-4 mb-2 rounded-xl border ${isSelected ? 'bg-[#FFE4EB]/30' : 'border-gray-200 bg-white'}`} style={isSelected ? {borderColor: theme.primary} : {}}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             <p className="font-black text-[16px] leading-tight" style={isSelected ? {color: theme.primary} : {color: '#111827'}}>{size}</p>
                             
                          </div>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">{boxSize} Pcs Box {extraPrice > 0 && <span className="text-[12px] bg-orange text-gray-600 px-1.5 py-0.5 rounded font-bold border border-gray-200">+₹{extraPrice} Extra Price Per Pc </span>}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQty(size, -1, boxSize)} className={`w-8 h-8 rounded-full border flex items-center justify-center font-black active:scale-95 transition-all text-lg leading-none ${isSelected ? 'bg-white' : 'border-gray-200 text-gray-400'}`} style={isSelected ? {borderColor: theme.primary, color: theme.primary} : {}}>-</button>
                          <span className="w-5 text-center font-bold text-gray-900 text-[15px]">{qtyPieces}</span>
                          <button onClick={() => updateQty(size, 1, boxSize)} className={`w-8 h-8 rounded-full border flex items-center justify-center font-black active:scale-95 transition-all text-lg leading-none ${isSelected ? 'text-white' : 'border-gray-200 text-gray-400'}`} style={isSelected ? {backgroundColor: theme.primary, borderColor: theme.primary} : {}}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

             <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white p-3 border-t border-gray-200 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] flex items-center gap-3">
                 <div className="flex flex-col w-1/3 shrink-0 pl-1 border-r border-gray-100">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Sold By</span>
                   <span className="text-xs font-black text-gray-900 truncate pr-2">{selectedProduct.seller || 'Nayika Naari'}</span>
                 </div>
                 <button 
                   onClick={addToTruck} 
                   disabled={isAdding} 
                   className="w-2/3 flex-1 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-all btn-premium glow-effect"
                 >
                   {isAdding ? (
                     <Loader2 size={20} className="animate-spin"/>
                   ) : (
                     <ShoppingCart size={20} className="icon-heartbeat drop-shadow-md" />
                   )}
                   {currentTotal > 0 ? `ADD TO CART (₹ ${currentTotal})` : 'ADD TO CART'}
                 </button>
              </div>
            </div>
          );
        })()}

        {view === 'cart' && (
          <div className="animate-in slide-in-from-bottom-4 duration-300 bg-[#F5F5F6] flex-1 flex flex-col pb-[120px] w-full relative">
             {!currentUser && cart.length > 0 && (
                <div className="bg-white p-3 flex justify-between items-center border-b border-gray-200 m-2 rounded-xl shadow-sm">
                  <p className="text-[11px] font-bold text-gray-600">Log in to save your cart.</p>
                  <button onClick={() => setView('auth_phone')} className="text-white text-[10px] font-bold px-3 py-1.5 rounded" style={{backgroundColor: theme.primary}}>Login</button>
                </div>
             )}

             {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-32 text-gray-400 font-medium space-y-3 bg-[#F5F5F6] w-full h-full">
                <ShoppingCart size={60} className="mx-auto opacity-20" />
                <p className="text-sm font-bold text-gray-600">Hey, it feels so light!</p>
                <p className="text-xs">There is nothing in your cart. Let's add some items.</p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2">
                
                {/* 🌟 NEW ADDRESS CARD & SELLER PILLS (UPDATED UI) */}
                <div className="bg-white p-4 border-b border-gray-200 shadow-sm mb-2">
                   <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 text-[14px]">
                         <span className="font-bold text-gray-900">Deliver to:</span>
                         <span className="font-black" style={{color: theme.primary}}>{addressData.name || 'User'}</span>
                         <span className="text-gray-500 text-[12px] ml-1">{addressData.mobile || '---'}</span>
                      </div>
                      <button onClick={() => { if(currentUser) setActiveSheet('address'); else { alert("Login to add address"); setView('auth_phone'); } }} className="text-xs font-black uppercase tracking-widest" style={{color: theme.primary}}>Change</button>
                   </div>
                   <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mt-1" translate="no">
                     <span>{addressData.address || 'Address not added'}</span>, <span>{addressData.city}</span>, <span>{addressData.state}</span> - <span>{addressData.pincode}</span>
                   </p>

                 {/* SELLER PILLS (FIXED: 2 Sellers Visible) */}
                   {cartSellers.length > 0 && activeCartSeller && (() => {
                     // 🌟 FIX: Active seller ko pehle rakha, aur bache hue me se 1 aur le liya (Total Max 2)
                     const visibleSellers = [activeCartSeller, ...cartSellers.filter(s => s !== activeCartSeller)].slice(0, 3);

                     return (
                       <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                           {visibleSellers.map(seller => {
                              // 🌟 FIX: Is seller ke cart mein kitne unique products hain wo count kiya
                              const productCount = new Set(cart.filter(i => (i.seller || 'Nayika Naari') === seller).map(i => i.id)).size;
                              
                              return (
                                <button 
                                   key={seller}
                                   onClick={() => setActiveCartSeller(seller)}
                                   className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors border ${activeCartSeller === seller ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                   style={activeCartSeller === seller ? {backgroundColor: theme.primary} : {}}
                                >
                                   {seller} ({productCount})
                                </button>
                              )
                           })}

                           {/* 🌟 FIX: Agar 2 se zyada hain toh bache hue ka count dikhao */}
                           {cartSellers.length > 3 && (
                              <button 
                                 onClick={() => setIsSellerSheetOpen(true)}
                                 className="px-3 py-1.5 rounded-full text-[12px] font-black whitespace-nowrap bg-transparent text-blue-700 hover:underline"
                              >
                                 +{cartSellers.length - 3} Sellers
                              </button>
                           )}
                       </div>
                     );
                   })()}
                </div>

                <div className="flex flex-col gap-2 bg-[#F5F5F6]">
                  {groupedCart.map((group, idx) => {
                    const hasOOS = group.oosSizes.length > 0;
                    const sizesArray = Object.entries(group.sizesMap);
                    const displayedSizes = sizesArray.slice(0, 5);
                    const hiddenSizesCount = sizesArray.length - 5;

                    return (
                    <div key={idx} className="bg-white p-3 relative shadow-sm border-b border-gray-100">
                      <button onClick={async () => {
                          const updatedCart = cart.filter(item => item.id !== group.id);
                          setCart(updatedCart);
                          if(currentUser) {
                             await supabase.from('cart_items').delete().match({ user_id: currentUser.id, product_id: group.id, status: 0 });
                          } else {
                             localStorage.setItem('nayika_naari_guest_cart', JSON.stringify(updatedCart));
                          }
                          showToast("Item Removed");
                      }} className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors z-10"><X size={16}/></button>

                      <div className="flex gap-3">
                         {/* Left Column: Logo & Image */}
                         <div className="flex flex-col items-center gap-1 w-[85px] shrink-0">
                           <img src="/logo.png" alt="Brand" className="h-4 object-contain opacity-80 mb-1" />
                           <div 
                             className="w-full aspect-[3/4] bg-gray-50 cursor-pointer rounded overflow-hidden border border-gray-100"
                             onClick={() => { const imgs = safeParseJSON(group.productRef.img, {images:[]}).images; setZoomOverlay({images: imgs, currentIndex: 0}); }}
                           >
                             <img src={group.displayImg} className="w-full h-full object-cover mix-blend-multiply" alt="" />
                           </div>
                         </div>
                         
                         {/* Right Column: Details */}
                         <div className="flex-1 flex flex-col pt-1">
                            <h4 className="font-black text-gray-900 text-[13px] leading-tight pr-6 uppercase tracking-tight">{group.name}</h4>
                            <p className="text-gray-500 text-[11px] mt-0.5">{group.subcategory}</p>
                            
                            <div className="flex justify-between items-end mt-1">
                                <div>
                                   {group.totalPrice > 0 ? (
                                      <p className="font-black text-gray-900 text-[18px]">₹{group.totalPrice}</p>
                                   ) : (
                                      <p className="font-black text-red-500 text-[14px]">Unavailable</p>
                                   )}
                                   <p className="font-medium text-gray-500 text-[11px]">Total: {group.totalBoxes} Box ({group.totalPcs} Pcs)</p>
                                </div>

                                <div className="flex flex-col items-end gap-1.5">
                                    {hasOOS && (
                                       <div className="bg-[#FFF0F0] text-[#FF3F6C] text-[10px] font-bold px-2 py-1 rounded-full border border-[#FFE4EB] whitespace-nowrap">
                                          Out of Stock: {group.oosSizes.join(', ')}
                                       </div>
                                    )}
                                    <button onClick={() => { setEditingGroup(group); setSizeQuantities(group.sizesMap); setActiveSheet('sizes'); }} className="text-[10px] font-bold bg-gray-100 px-2.5 py-1.5 rounded flex items-center gap-1 text-gray-700 border border-gray-200 active:bg-gray-200">
                                       Edit Sizes & Qty ▾
                                    </button>
                                </div>
                            </div>
                            
                            {/* Bottom Row: Sizes List */}
                            <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                              {displayedSizes.map(([sz, q]: any) => {
                                 const isOOS = group.oosSizes.includes(sz);
                                 return (
                                    <span key={sz} className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shadow-sm flex gap-1 ${isOOS ? 'bg-red-50 text-red-400 border-red-100 line-through' : 'bg-white text-gray-700 border-gray-200'}`}>
                                      <span>{sz}:</span> <span className={isOOS ? "text-red-400" : "text-blue-600"}>{q}</span>
                                    </span>
                                 )
                              })}
                              {/* 🌟 FIX: Made "+X more" clickable to open the edit sizes sheet */}
                              {hiddenSizesCount > 0 && (
                                  <button 
                                      onClick={() => { setEditingGroup(group); setSizeQuantities(group.sizesMap); setActiveSheet('sizes'); }} 
                                      className="text-[11px] font-black text-blue-700 ml-1 hover:underline active:opacity-50"
                                  >
                                      +{hiddenSizesCount} more
                                  </button>
                              )}
                            </div>
                         </div>
                      </div>
                    </div>
                  )})}
                </div>

                {(() => {
                   return (
                     <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white border-t border-gray-200 z-50 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                        {!isMovMet && minOrderVal > 0 ? (
                           <div className={`bg-red-50 p-2.5 text-[11px] text-red-600 font-bold text-center border-b border-red-100 leading-tight ${shakeBanner ? 'animate-shake' : ''}`}>
                             <span>Minimum order value for {activeCartSeller} is ₹{minOrderVal}. Add items worth ₹{minOrderVal - cartTotalAmount}/- more.</span>
                           </div>
                        ) : (
                           <div className="bg-[#FFF4E5] p-2.5 text-[11px] text-[#A65B00] font-bold text-center border-b border-[#FFE0B2] leading-tight">
                             <span>Few Sizes/Products may be out of stock, confirmed over call.</span>
                           </div>
                        )}
                        <div className="p-3 flex justify-between items-center w-full">
                          <div className="flex flex-col ml-1">
                             <p className="font-bold text-gray-600 text-[11px]">
                               <span>{shippingCharge > 0 ? 'To Confirm, Pay Shipping 100/- on' : 'Free Shipping'}</span>
                             </p>
                             {shippingCharge > 0 && (
                               <div className="flex flex-col justify-center mt-1">
                                  <div className="flex bg-white border border-blue-200 rounded-md overflow-hidden shadow-sm w-fit">
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `tez://upi/pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=100&cu=INR`;
                                      }} 
                                      className="px-2.5 py-1.5 text-[9px] font-black text-blue-700 hover:bg-blue-50 border-r border-blue-100 active:bg-blue-100 transition-colors"
                                    >
                                      GPay
                                    </button>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `phonepe://pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=100&cu=INR`;
                                      }} 
                                      className="px-2.5 py-1.5 text-[9px] font-black text-purple-700 hover:bg-purple-50 border-r border-blue-100 active:bg-purple-100 transition-colors"
                                    >
                                      PhonPe
                                    </button>
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `paytmmp://pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=100&cu=INR`;
                                      }} 
                                      className="px-2.5 py-1.5 text-[9px] font-black text-[#00B9F5] hover:bg-[#F0FAFF] active:bg-[#D9F4FF] transition-colors"
                                    >
                                      Paytm
                                    </button>
                                  </div>
                                </div>
                             )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={handlePlaceOrderClick} className={`px-5 py-3.5 rounded font-bold uppercase tracking-widest text-[12px] shadow-sm transition-all ${isMovMet ? 'text-white active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'}`} style={isMovMet ? {backgroundColor: theme.primary} : {}}>
                                PLACE ORDER (₹{cartTotalAmount})
                             </button>
                          </div>
                        </div>
                     </div>
                   );
                })()}
              </div>
            )}
          </div>
        )}

        {view === 'orders' && (
          <div className="animate-in fade-in duration-300 flex flex-col flex-1 bg-[#F5F5F6] relative">
            
            <div className="px-4 pt-4 pb-2">
              <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 flex items-center shadow-sm">
                 <Search size={18} className="text-gray-400 mr-2" />
                 <input 
                   type="text" 
                   placeholder="Search Order ID..." 
                   className="w-full text-sm font-bold text-gray-700 outline-none"
                   value={orderSearchQuery}
                   onChange={e => setOrderSearchQuery(e.target.value)}
                 />
                 {orderSearchQuery && <X size={16} className="text-gray-400 cursor-pointer" onClick={() => setOrderSearchQuery('')}/>}
              </div>
            </div>

            <div className="px-4 pb-[120px] flex flex-col gap-4">
              {loading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-500" size={40} /></div> ) : myOrders.length === 0 ? ( <div className="text-center py-24 text-gray-500 font-bold text-base bg-white rounded-2xl border border-gray-200 shadow-sm mx-2 flex flex-col items-center"><ClipboardList size={60} className="mb-4 opacity-30"/><p>You haven't placed any orders yet.</p></div> ) : (
                myOrders.filter(o => (o.id ? o.id.toString() : '').includes(orderSearchQuery)).map((o, index) => {
                  const finalAmt = (o.finalAmount !== null && o.finalAmount !== undefined) ? o.finalAmount : o.amount;
                  const isCancelled = o.status === 'Cancelled';
                  
                  const allImages = (o.order_details || []).map((item: any) => safeParseJSON(item.meta, {})?.img).filter(Boolean);
                  const uniqueImages = Array.from(new Set(allImages));
                  const previewImages = uniqueImages.slice(0, 5);
                  const extraItemsCount = uniqueImages.length > 5 ? uniqueImages.length - 5 : 0;

                  return (
                    <div key={o.id || `order_${index}`} onClick={() => openOrderDetails(o)} className={`bg-white rounded-2xl p-4 border shadow-sm cursor-pointer active:scale-[0.98] transition-transform ${isCancelled ? 'border-red-100 opacity-80' : 'border-gray-200'}`}>
                      
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 pr-2">
                          {/* 🌟 NAYA: Added Seller Pill next to Order ID as per design */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-[13px] font-black text-gray-700 tracking-widest uppercase">ORDER #{o.id || 'N/A'}</p>
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-200">
                               Sold By: {safeParseJSON(o.meta, {})?.sellerName || 'Nayika Naari'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-500">{safeFormatDate(o.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-black text-[22px] leading-none ${isCancelled ? 'text-gray-500 line-through' : 'text-[#008A00]'}`}>₹{finalAmt}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col bg-[#F8F9FA] p-3 rounded-xl mb-3 border border-gray-100 gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm font-bold text-gray-700">
                            <div className="flex items-center gap-1.5"><Package size={16} className="text-gray-500"/> {o.box} Box</div>
                            <div className="flex items-center gap-1.5"><SlidersHorizontal size={16} className="text-gray-500"/> {o.pcs} Pcs</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(o.status === 'Confirmed' && safeParseJSON(o.meta, {})?.expectedDispatch) && (
                              <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100 flex items-center gap-1">
                                <Truck size={10} />
                                Dispatch: {new Date(safeParseJSON(o.meta, {}).expectedDispatch).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${
                              o.status === 'Dispatched' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              o.status === 'Delivered' ? 'bg-[#E5F7ED] text-[#008A00] border-[#C2EED7]' : 
                              o.status === 'Cancelled' ? 'bg-[#FFF0F0] text-[#FF3F6C] border-[#FFE4EB]' :
                              'bg-[#FFF4E5] text-[#E07A5F] border-[#FFE0B2]'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {previewImages.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                           {previewImages.map((imgUrl: any, i: number) => (
                             <div key={i} className="w-10 h-10 rounded border border-gray-200 p-0.5 shrink-0 bg-white">
                               <img src={imgUrl as string} className="w-full h-full object-cover rounded-sm" alt="Product" />
                             </div>
                           ))}
                           {extraItemsCount > 0 && (
                             <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 border border-gray-200 shrink-0">
                               +{extraItemsCount}
                             </div>
                           )}
                        </div>
                      )}

                     {o.status === 'Pending' && o.advance === 100 && !safeParseJSON(o.meta, {})?.screenshot_uploaded && (
                         <div className="mb-3 flex flex-col gap-2.5 bg-red-50 p-3 rounded-xl border border-red-100">
                           <p className="text-[11px] font-bold text-[#FF3F6C] text-center leading-tight">
                             Pay & Upload ₹100 Payment Screenshot
                           </p>
                           
                           <div className="flex w-full bg-white border border-blue-200 rounded-lg overflow-hidden shadow-sm">
                             <button onClick={(e) => {
                                 e.stopPropagation();
                                 window.location.href = `tez://upi/pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=${o.advance}&cu=INR`;
                               }} 
                               className="flex-1 py-2.5 text-[10px] font-black text-blue-700 hover:bg-blue-50 border-r border-blue-100 active:bg-blue-100 transition-colors text-center"
                             >
                               GPay
                             </button>

                             <button onClick={(e) => {
                                 e.stopPropagation();
                                 window.location.href = `phonepe://pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=${o.advance}&cu=INR`;
                               }} 
                               className="flex-1 py-2.5 text-[10px] font-black text-purple-700 hover:bg-purple-50 border-r border-blue-100 active:bg-purple-100 transition-colors text-center"
                             >
                               PhonePe
                             </button>

                             <button onClick={(e) => {
                                 e.stopPropagation();
                                 window.location.href = `paytmmp://pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=${o.advance}&cu=INR`;
                               }} 
                               className="flex-1 py-2.5 text-[10px] font-black text-[#00B9F5] hover:bg-[#F0FAFF] active:bg-[#D9F4FF] transition-colors text-center"
                             >
                               Paytm
                             </button>
                           </div>
                         </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

          </div>
        )}

        {view === 'order_detail' && selectedOrder && (() => {
          const isCancelled = selectedOrder.status === 'Cancelled';
          const isPending = selectedOrder.status === 'Pending';
          const orderMeta = safeParseJSON(selectedOrder.meta, {});
          
          let currentCalc = 0;
          if (orderItems.length === 0) {
            currentCalc = selectedOrder.amount || 0; 
          } else {
            orderItems.forEach(item => {
              const q = item.remainingQty !== null && item.remainingQty !== undefined ? item.remainingQty : item.qty;
              currentCalc += q * item.rate;
            });
          }

          return (
            <div className="animate-in slide-in-from-right duration-300 flex flex-col min-h-full bg-[#F8F9FA] pb-24">
              <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`text-sm font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                      selectedOrder.status === 'Dispatched' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                      selectedOrder.status === 'Delivered' ? 'bg-[#E5F7ED] text-[#008A00] border-[#C2EED7]' : 
                      isCancelled ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                    }`}>
                      {selectedOrder.status}
                    </span>
                    <p className="text-sm text-gray-500 font-bold mt-3">{safeFormatDate(selectedOrder.createdAt)}</p>
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-gray-200">
                               Sold By: {safeParseJSON(selectedOrder.meta, {})?.sellerName || 'Nayika Naari'}
                            </span>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Items Total</p>
                    <p className={`font-black text-2xl mt-0.5 ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>₹{currentCalc}/-</p>
                    {currentCalc !== selectedOrder.amount && !isCancelled && <p className="text-xs text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded inline-block mt-1">Orig: ₹{selectedOrder.amount}</p>}
                  </div>
                </div>

                <div className="mt-2 mx-4 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MapPin size={12} /> Delivery Details
                  </h3>
                  <p className="text-sm font-bold text-gray-900">{selectedOrder.address}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">
                    {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}
                  </p>

                  {(selectedOrder.status === 'Confirmed' && orderMeta?.expectedDispatch) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Truck size={12} /> Expected Dispatch: {new Date(orderMeta.expectedDispatch).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {selectedOrder.tracking && !isCancelled && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2" style={{color: theme.primary}}>
                      <Navigation size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Tracking Available</span>
                    </div>
                    <button 
                      onClick={handleTrackOrder}
                      style={{backgroundColor: theme.primary}}
                      className="text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-sm active:scale-95 transition-transform uppercase tracking-wider"
                    >
                      Track Order
                    </button>
                  </div>
                )}
              </div>

              {isPending && (
                <div className="p-4 bg-white border-b border-gray-200 flex flex-col gap-3">
                   <div className="flex justify-between items-center bg-orange-50 p-3 rounded-xl border border-orange-100">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-orange-800">Order is not confirmed yet.</span>
                        <span className="text-[9px] font-medium text-orange-600">You can cancel or update payment info.</span>
                      </div>
                      <button onClick={cancelOrder} disabled={isCancelling} className="text-[10px] font-black text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-lg active:scale-95 flex items-center gap-1">
                        {isCancelling ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Cancel
                      </button>
                   </div>
                   
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 overflow-x-auto">
                      <div className="flex flex-col flex-1 min-w-[120px] mr-2">
                         <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-0.5">Pay Online</span>
                         {orderMeta.screenshot_uploaded ? (
                           <a href={orderMeta.screenshot_uploaded === true ? '#' : orderMeta.screenshot_uploaded} target="_blank" className="text-[11px] font-bold text-blue-600 underline">View SS</a>
                         ) : (
                           <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle size={10}/>SS Not Uploaded</span>
                         )}
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-2">
                         <div className="flex bg-white border border-blue-200 rounded-lg overflow-hidden shadow-sm">
                           <button onClick={(e) => {
                               e.stopPropagation();
                               window.location.href = `tez://upi/pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=${selectedOrder.advance}&cu=INR`;
                             }} 
                             className="px-2 py-2 text-[9px] font-black text-blue-700 hover:bg-blue-50 border-r border-blue-100 active:bg-blue-100 transition-colors"
                           >
                             GPay
                           </button>

                           <button onClick={(e) => {
                               e.stopPropagation();
                               window.location.href = `phonepe://pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=${selectedOrder.advance}&cu=INR`;
                             }} 
                             className="px-2 py-2 text-[9px] font-black text-purple-700 hover:bg-purple-50 border-r border-blue-100 active:bg-purple-100 transition-colors"
                           >
                             PhnPe
                           </button>

                           <button onClick={(e) => {
                               e.stopPropagation();
                               window.location.href = `paytmmp://pay?pa=gpay-11165292302@okbizaxis&pn=Nayika%20Naari&tn=${currentUser?.name}_${currentUser?.phone}&am=${selectedOrder.advance}&cu=INR`;
                             }} 
                             className="px-2 py-2 text-[9px] font-black text-[#00B9F5] hover:bg-[#F0FAFF] active:bg-[#D9F4FF] transition-colors"
                           >
                             Paytm
                           </button>
                         </div>

                         <input type="file" id="update-ss" className="hidden" accept="image/*" onChange={uploadOrderScreenshot} />
                         <label htmlFor="update-ss" className="bg-gray-900 text-white px-3 py-2 rounded-lg text-[10px] font-black cursor-pointer active:scale-95 transition-transform flex items-center gap-1 m-0">
                            {isUploadingScreenshot ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} 
                            {orderMeta.screenshot_uploaded ? 'Update SS' : 'Upload SS'}
                         </label>

                      </div>
                   </div>
                </div>
              )}

              <div className="p-4 space-y-4">
                <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2"><Package size={16}/> Items Breakdown</h3>
                
                {loading ? ( <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" size={24} /></div> ) : orderItems.length === 0 ? (
                  <p className="text-center text-xs font-bold text-gray-400">Items detail not available.</p>
                ) : (
                  (() => {
                    const groupedItems = orderItems.reduce((acc, item) => {
                      const pId = item.productid;
                      if(!acc[pId]) acc[pId] = { name: item.meta?.name || 'Product', img: item.meta?.img || '', items: [] };
                      acc[pId].items.push(item);
                      return acc;
                    }, {});

                    return Object.entries(groupedItems).map(([pId, group]: any) => (
                      <div key={pId} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isCancelled ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
                        <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-3 items-center">
                          <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 p-0.5 shrink-0" onClick={() => setZoomOverlay({images: [group.img], currentIndex: 0})}>
                            <img src={group.img} className="w-full h-full object-cover rounded-md" alt="" />
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 truncate">{group.name}</h4>
                        </div>
                        
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">
                            <span className="w-10">Size</span>
                            <span className="flex-1 text-center">Quantity</span>
                            <span className="text-right w-16">Amount</span>
                          </div>
                          
                          {group.items.map((item: any) => {
                            const hasChanged = item.remainingQty !== null && item.remainingQty !== undefined && item.remainingQty !== item.qty;
                            const finalQty = hasChanged ? item.remainingQty : item.qty;
                            const isOOS = item.remainingQty === 0 && item.qty > 0;
                            
                            return (
                              <div key={item.id} className={`flex justify-between items-center text-sm font-bold bg-white border p-2 rounded-lg ${isOOS ? 'border-red-100 opacity-60' : 'border-gray-100'}`}>
                                <span className="w-10 text-gray-900">{item.size}</span>
                                
                                <div className="flex-1 flex flex-col items-center justify-center text-[11px]">
                                  {isOOS ? (
                                      <span className="text-red-500 font-black bg-red-50 px-2 rounded border border-red-200">OUT OF STOCK</span>
                                  ) : hasChanged ? (
                                     <>
                                       <span className="text-gray-400 line-through">Orig: {item.qty}</span>
                                       <span className="text-orange-600 font-black bg-orange-50 px-1.5 rounded">New: {finalQty}</span>
                                     </>
                                  ) : (
                                     <span className="text-gray-700">{finalQty} Pcs</span>
                                  )}
                                </div>
                                
                                <span className="text-right w-16 text-gray-800">₹{finalQty * item.rate}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          );
        })()}

        {/* --- PROFILE --- */}
        {view === 'profile' && (
           <div className="animate-in fade-in duration-300 bg-[#F5F5F6] flex-1 min-h-full">
             {currentUser ? (
               <>
                 <div className="bg-white p-6 shadow-sm mb-2 border-b border-gray-200 flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-100 text-gray-800 flex items-center justify-center font-black text-3xl uppercase rounded-full mb-3">{currentUser?.name?.charAt(0) || 'U'}</div>
                    <h2 className="font-bold text-lg text-gray-900">{currentUser?.name}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">+91 {currentUser?.phone}</p>
                 </div>
                 
                 <div className="bg-white p-4 shadow-sm border-b border-gray-200 mb-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Saved Address</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{currentUser?.address}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{currentUser?.city}, {currentUser?.state} - {currentUser?.pincode}</p>
                 </div>

                 {deferredPrompt && (
                   <div className="px-4 mb-4">
                     <button onClick={handleInstallClick} style={{backgroundColor: theme.primary}} className="w-full text-white py-3.5 rounded font-bold text-xs tracking-widest flex items-center justify-center gap-2 shadow-sm uppercase">
                       <Download size={16} /> Install App to Home Screen
                     </button>
                   </div>
                 )}

                 {currentUser?.user_type?.includes('seller') && (
                   <div className="px-4 mb-4">
                     <button onClick={() => window.location.href = '/seller'} className="w-full bg-[#282C3F] text-white py-3.5 rounded font-bold text-xs tracking-widest flex items-center justify-center gap-2 shadow-sm uppercase">
                       <Plus size={16} /> Switch to Seller Mode
                     </button>
                   </div>
                 )}
                 <div className="px-4">
                   <button onClick={handleLogout} className="w-full bg-white border border-gray-300 text-gray-700 py-3.5 font-bold flex items-center justify-center gap-2 rounded shadow-sm text-xs tracking-widest uppercase">
                      Log Out
                   </button>
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center py-32 h-full px-6 text-center">
                 <User size={60} className="text-gray-300 mb-4" />
                 <h2 className="font-bold text-lg text-gray-800 mb-2">Not Logged In</h2>
                 <p className="text-sm text-gray-500 mb-6">Login to view profile and orders.</p>
                 <button onClick={() => setView('auth_phone')} style={{backgroundColor: theme.primary}} className="text-white font-bold uppercase text-xs tracking-widest px-8 py-3.5 rounded shadow-sm">Login Now</button>
               </div>
             )}
           </div>
        )}

        {/* 🌟 NAYA: MULTI-SELECT FILTERS SHEET */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-[5000] flex justify-end flex-col">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFilterSheetOpen(false)}></div>
          <div className="bg-white w-full max-w-[450px] mx-auto rounded-t-[2rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl flex flex-col h-[85vh] border-x border-gray-200">
             
             <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
               <h3 className="font-black text-lg text-gray-900 uppercase tracking-widest">Filters</h3>
               <button onClick={() => setIsFilterSheetOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={18}/></button>
             </div>

             <div className="flex flex-1 overflow-hidden">
                <div className="w-1/3 bg-gray-50 flex flex-col border-r border-gray-100 pt-2">
                   {/* 🌟 FIX: Added dynamic counts to each filter tab */}
                   {['Category', 'Price', 'Seller'].map(tab => {
                      let count = 0;
                      if (tab === 'Category') count = tempFilters.subcategories.length;
                      if (tab === 'Price') count = tempFilters.priceRanges.length;
                      if (tab === 'Seller') count = tempFilters.sellers.length;

                      return (
                        <button 
                           key={tab}
                           onClick={() => setActiveFilterTab(tab)}
                           className={`py-4 px-4 text-left text-xs font-black uppercase tracking-wider relative transition-all flex items-center justify-between gap-1 ${activeFilterTab === tab ? 'bg-white text-gray-900 shadow-[-5px_0_10px_rgba(0,0,0,0.02)]' : 'text-gray-500'}`}
                        >
                           {activeFilterTab === tab && <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r" style={{backgroundColor: theme.primary}}></div>}
                           <span>{tab}</span>
                           {count > 0 && (
                              <span className="w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-sm" style={{backgroundColor: theme.primary}}>
                                {count}
                              </span>
                           )}
                        </button>
                      )
                   })}
                </div>
                
                <div className="w-2/3 flex flex-col bg-white overflow-y-auto p-5 space-y-5">
                {/* DYNAMIC CATEGORIES */}
                   {activeFilterTab === 'Category' && filterOptions.subcats.map(subcat => (
                      <div key={subcat} onClick={() => toggleTempFilter('subcategories', subcat)} className="flex items-center gap-3 cursor-pointer group">
                         <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-colors ${tempFilters.subcategories.includes(subcat) ? 'border-transparent' : 'border-gray-300 group-hover:border-gray-400'}`} style={tempFilters.subcategories.includes(subcat) ? {backgroundColor: theme.primary} : {}}>
                            {tempFilters.subcategories.includes(subcat) && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                         </div>
                         <span className={`text-[13px] font-bold ${tempFilters.subcategories.includes(subcat) ? 'text-gray-900' : 'text-gray-600'}`}>{subcat}</span>
                      </div>
                   ))}
                   {/* DYNAMIC PRICE RANGES */}
                   {activeFilterTab === 'Price' && filterOptions.prices.map(price => (
                      <div key={price} onClick={() => toggleTempFilter('priceRanges', price)} className="flex items-center gap-3 cursor-pointer group">
                         <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-colors ${tempFilters.priceRanges.includes(price) ? 'border-transparent' : 'border-gray-300 group-hover:border-gray-400'}`} style={tempFilters.priceRanges.includes(price) ? {backgroundColor: theme.primary} : {}}>
                            {tempFilters.priceRanges.includes(price) && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                         </div>
                         <span className={`text-[13px] font-bold ${tempFilters.priceRanges.includes(price) ? 'text-gray-900' : 'text-gray-600'}`}>₹{price.split('-')[0]} - ₹{price.split('-')[1]}</span>
                      </div>
                   ))}

                   {/* DYNAMIC SELLERS */}
                   {activeFilterTab === 'Seller' && filterOptions.sellers.map(seller => (
                      <div key={seller} onClick={() => toggleTempFilter('sellers', seller)} className="flex items-center gap-3 cursor-pointer group">
                         <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-colors ${tempFilters.sellers.includes(seller) ? 'border-transparent' : 'border-gray-300 group-hover:border-gray-400'}`} style={tempFilters.sellers.includes(seller) ? {backgroundColor: theme.primary} : {}}>
                            {tempFilters.sellers.includes(seller) && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                         </div>
                         <span className={`text-[13px] font-bold ${tempFilters.sellers.includes(seller) ? 'text-gray-900' : 'text-gray-600'}`}>{seller}</span>
                      </div>
                   ))}

                   
                </div>
             </div>

             <div className="p-4 border-t border-gray-100 flex items-center gap-3 shrink-0 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                {/* 🌟 FIX: Added total count of applied filters to Clear All button */}
                {(() => {
                   const totalFilters = tempFilters.subcategories.length + tempFilters.sellers.length + tempFilters.priceRanges.length;
                   return (
                      <>
                        <button 
                          onClick={() => setTempFilters({ subcategories: [], sellers: [], priceRanges: [] })}
                          className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-black text-[11px] uppercase tracking-widest active:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                           Clear All {totalFilters > 0 && <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded-md">({totalFilters})</span>}
                        </button>
                        <button 
                          onClick={() => { setAppliedFilters(tempFilters); setIsFilterSheetOpen(false); }}
                          className="flex-1 py-3.5 rounded-xl text-white font-black text-[11px] uppercase tracking-widest active:scale-95 transition-transform btn-premium"
                        >
                           Apply Filters
                        </button>
                      </>
                   )
                })()}
             </div>
          </div>
        </div>
      )}
      </main>

      {/* --- SIZES EDIT SHEET --- */}
      {activeSheet === 'sizes' && editingGroup && (() => {
        const productData = editingGroup.productRef;
        const metaData = safeParseJSON(productData.meta, {});
        const sizesRaw = metaData?.attributes?.available_sizes || {};
        const sizes = Array.isArray(sizesRaw) 
           ? sizesRaw 
           : Object.keys(sizesRaw).filter(s => sizesRaw[s].is_active !== false);

        const getExtraPrice = (s: string) => Array.isArray(sizesRaw) ? 0 : (sizesRaw[s]?.extra_price || 0);
        const boxSize = metaData?.attributes?.box_size?.[0] || 6;
        
        let editSheetTotal = 0;
        for (const [size, qtyPieces] of Object.entries(sizeQuantities)) {
          // 🌟 FIX: Ignore OOS sizes from Total calculation
          if (qtyPieces > 0 && !editingGroup.oosSizes?.includes(size)) {
             editSheetTotal += qtyPieces * (productData.cost + getExtraPrice(size));
          }
        }

        return (
          <div className="fixed inset-0 z-[100] flex justify-end flex-col">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveSheet('none')}></div>
            <div className="bg-[#F5F5F6] w-full max-w-[450px] mx-auto rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl flex flex-col max-h-[90vh] border-x border-gray-200">
              <div className="bg-white p-5 rounded-t-[2.5rem] border-b border-gray-200 shrink-0">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5"></div>
                <div className="flex gap-4 items-center">
                   <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center p-2 border border-gray-200 shrink-0 shadow-sm">
                     <img src={editingGroup.displayImg} className="w-full h-full object-cover rounded-md" alt="" />
                   </div>
                   <div>
                      <h4 className="font-black text-gray-900 text-base leading-tight pr-4 mb-1">{editingGroup.subcategory}- {editingGroup.name}</h4>
                      <p className="font-black text-gray-900 text-xl">₹{productData.cost} <span className="text-sm font-bold text-gray-400 line-through">₹{productData.mrp}</span></p>
                   </div>
                   <button onClick={() => setActiveSheet('none')} className="ml-auto w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 shrink-0"><X size={18}/></button>
                </div>
              </div>
              <div className="overflow-y-auto bg-white flex-1 p-5">
                <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-4">Update Sizes</h3>
                <div>
                  {sizes.map((size: string, index: number) => {
                    const extraPrice = getExtraPrice(size);
                    const qtyPieces = sizeQuantities[size] || 0;
                    const isSelected = qtyPieces > 0;
                    const isOOS = editingGroup.oosSizes?.includes(size);

                    return (
                      // 🌟 FIX: OOS row ko opacity-50 aur unclickable (pointer-events-none) kar diya
                      <div key={size} className={`flex justify-between items-center py-4 mb-3 rounded-xl border px-4 ${isOOS ? 'opacity-50 pointer-events-none bg-gray-50' : isSelected ? 'bg-[#FFE4EB]/30' : 'border-gray-200'}`} style={isSelected && !isOOS ? {borderColor: theme.primary} : {}}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             <p className="font-black text-[18px] leading-tight" style={isSelected ? {color: theme.primary} : {color: '#111827'}}>{size}</p>
                             {isOOS && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-black border border-red-200">OOS</span>}
                             {!isOOS && extraPrice > 0 && <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-black border border-gray-200">+₹{extraPrice}</span>}
                          </div>
                          <p className="text-sm text-gray-500 font-bold mt-1">{boxSize} Pcs Box</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={() => updateQty(size, -1, boxSize)} className={`w-10 h-10 rounded-full border flex items-center justify-center font-black active:scale-95 transition-all text-xl leading-none ${isSelected ? 'bg-white shadow-sm' : 'border-gray-200 text-gray-400'}`} style={isSelected ? {borderColor: theme.primary, color: theme.primary} : {}}>-</button>
                          <span className="w-6 text-center font-black text-gray-900 text-[17px]">{qtyPieces}</span>
                          <button onClick={() => updateQty(size, 1, boxSize)} className={`w-10 h-10 rounded-full border flex items-center justify-center font-black active:scale-95 transition-all text-xl leading-none ${isSelected ? 'text-white shadow-sm' : 'border-gray-200 text-gray-400'}`} style={isSelected ? {backgroundColor: theme.primary, borderColor: theme.primary} : {}}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
             <div className="bg-white p-4 border-t border-gray-200 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                 <button 
                   onClick={async () => {
                      const newItems = processTruckUpdate(editingGroup.productRef);
                      const filteredCart = cart.filter(item => item.id !== editingGroup.id);
                      const updatedCart = [...filteredCart, ...newItems];
                      setCart(updatedCart);
                      
                      if (currentUser) {
                         await supabase.from('cart_items').delete().match({ user_id: currentUser.id, product_id: editingGroup.id, status: 0 });
                         const dbUpsertData = newItems.map((item: any) => ({
                           user_id: currentUser.id, product_id: item.id, size: item.selectedSize,
                           qty: item.qtyPieces, status: 0, seller: item.seller || null, updated_at: getLocalTimestamp()
                         }));
                         if(dbUpsertData.length > 0) await supabase.from('cart_items').upsert(dbUpsertData, { onConflict: 'user_id, product_id, size, status' });
                      } else {
                         localStorage.setItem('nayika_naari_guest_cart', JSON.stringify(updatedCart));
                      }
                      setActiveSheet('none');
                      showToast("Cart Updated");
                   }} 
                   className="w-full text-white py-4 font-black uppercase tracking-widest text-[13px] active:scale-95 transition-all btn-premium glow-effect flex justify-center items-center gap-2"
                 >
                   <ShoppingCart size={22} className="icon-heartbeat drop-shadow-md" />
                   UPDATE SIZES (₹{editSheetTotal})
                 </button>
              </div>
            </div>
          </div>
        )
      })()}

  {/* --- SELLER SHEET --- */}
      {isSellerSheetOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end flex-col">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSellerSheetOpen(false)}></div>
          <div className="bg-white w-full max-w-[450px] mx-auto p-5 rounded-t-[2rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
             <button onClick={() => setIsSellerSheetOpen(false)} className="absolute top-4 right-4 text-gray-400"><X size={20}/></button>
             <h3 className="font-black text-lg mb-4 text-gray-900">Select Seller Cart</h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 pb-4">
                {cartSellers.map(seller => {
                    const isSelected = activeCartSeller === seller;
                    const productCount = new Set(cart.filter(i => (i.seller || 'Nayika Naari') === seller).map(i => i.id)).size;

                    return (
                      <button 
                         key={seller}
                         onClick={() => { setActiveCartSeller(seller); setIsSellerSheetOpen(false); }}
                         className={`w-full text-left p-4 rounded-xl font-black text-sm border flex justify-between items-center transition-all active:scale-95 ${isSelected ? 'text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                         style={isSelected ? { backgroundColor: theme.primary } : {}}
                      >
                         <span>{seller} <span className={`text-xs ml-1 font-bold ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>({productCount} items)</span></span>
                         {isSelected && <CheckCircle2 size={18} className="text-white animate-in zoom-in duration-200"/>}
                      </button>
                    )
                })}
             </div>
          </div>
        </div>
      )}

  {/* --- ADDRESS SHEET --- */}
      {activeSheet === 'address' && (
        <div className="fixed inset-0 z-[100] flex justify-end flex-col">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveSheet('none')}></div>
          <div className="bg-white w-full max-w-[450px] mx-auto p-6 rounded-t-[2.5rem] relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl border-x border-gray-200">
            <button onClick={() => setActiveSheet('none')} className="absolute top-4 right-4 text-gray-400"><X size={20}/></button>
            <h3 className="font-bold text-lg mb-5 text-gray-900 pt-2">Delivery Details</h3>
            <div className="space-y-4 mb-2">
               <input type="text" placeholder="Full Name" value={addressData.name} onChange={e => setAddressData({...addressData, name: e.target.value})} className="input-field" />
               <input type="tel" placeholder="Mobile Number" value={addressData.mobile} onChange={e => setAddressData({...addressData, mobile: e.target.value})} className="input-field" />
               <input type="number" placeholder="Pincode" value={addressData.pincode} onChange={e => fetchPincodeDetails(e.target.value, false)} className="input-field" />
               <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="City" value={addressData.city} readOnly className="input-field bg-gray-50" />
                  <input type="text" placeholder="State" value={addressData.state} readOnly className="input-field bg-gray-50" />
               </div>
               <textarea placeholder="Complete Address" value={addressData.address} onChange={e => setAddressData({...addressData, address: e.target.value})} className="input-field h-24" />
            </div>
            
            <button 
              onClick={handleUpdateAddress} 
              disabled={loading}
              style={{backgroundColor: theme.primary}} 
              className="w-full text-white py-3.5 rounded font-bold uppercase tracking-widest text-[12px] shadow-sm mt-3 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16}/> : 'Save & Update Address'}
            </button>
            
          </div>
        </div>
      )}

      {/* 🌟 GLOBAL WHATSAPP ICON */}
      <div 
        className="fixed bottom-[85px] right-4 w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-[0_5px_20px_rgba(0,0,0,0.15)] cursor-pointer active:scale-95 transition-transform z-50 bg-white border border-gray-100"
        onClick={() => window.location.href = 'https://wa.me/919758008624?text=Hello Nayika Nari !'}
      >
        <svg height="66px" width="66px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 418.135 418.135" xmlSpace="preserve">
          <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
          <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
          <g id="SVGRepo_iconCarrier"> 
            <g> 
              <path style={{fill: "#7AD06D"}} d="M198.929,0.242C88.5,5.5,1.356,97.466,1.691,208.02c0.102,33.672,8.231,65.454,22.571,93.536 L2.245,408.429c-1.191,5.781,4.023,10.843,9.766,9.483l104.723-24.811c26.905,13.402,57.125,21.143,89.108,21.631 c112.869,1.724,206.982-87.897,210.5-200.724C420.113,93.065,320.295-5.538,198.929,0.242z M323.886,322.197 c-30.669,30.669-71.446,47.559-114.818,47.559c-25.396,0-49.71-5.698-72.269-16.935l-14.584-7.265l-64.206,15.212l13.515-65.607 l-7.185-14.07c-11.711-22.935-17.649-47.736-17.649-73.713c0-43.373,16.89-84.149,47.559-114.819 c30.395-30.395,71.837-47.56,114.822-47.56C252.443,45,293.218,61.89,323.887,92.558c30.669,30.669,47.559,71.445,47.56,114.817 C371.446,250.361,354.281,291.803,323.886,322.197z"></path> 
              <path style={{fill: "#7AD06D"}} d="M309.712,252.351l-40.169-11.534c-5.281-1.516-10.968-0.018-14.816,3.903l-9.823,10.008 c-4.142,4.22-10.427,5.576-15.909,3.358c-19.002-7.69-58.974-43.23-69.182-61.007c-2.945-5.128-2.458-11.539,1.158-16.218 l8.576-11.095c3.36-4.347,4.069-10.185,1.847-15.21l-16.9-38.223c-4.048-9.155-15.747-11.82-23.39-5.356 c-11.211,9.482-24.513,23.891-26.13,39.854c-2.851,28.144,9.219,63.622,54.862,106.222c52.73,49.215,94.956,55.717,122.449,49.057 c15.594-3.777,28.056-18.919,35.921-31.317C323.568,266.34,319.334,255.114,309.712,252.351z"></path> 
            </g> 
          </g>
        </svg>
      </div>

      {/* BOTTOM NAVIGATION */}
      {view !== 'pdp' && view !== 'cart' && view !== 'splash' && view !== 'auth_phone' && view !== 'login_password' && view !== 'signup' && view !== 'tracking' && view !== 'order_detail' && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white border-t border-gray-200 flex justify-around py-2 z-30 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
          <button onClick={() => setView('plp')} className="p-2 flex flex-col items-center gap-1"><Home color={view === 'plp' ? theme.primary : '#9CA3AF'} size={20} /> <span className="text-[9px] font-bold" style={{color: view === 'plp' ? theme.primary : '#9CA3AF'}}>Home</span></button>
          
          <button onClick={() => setView('cart')} className="relative p-2 flex flex-col items-center gap-1">
            <ShoppingCart color={view === 'cart' ? theme.primary : '#9CA3AF'} size={20} />
            {cart.length > 0 && <span className="absolute top-0 right-1 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center font-bold border border-white rounded-full" style={{backgroundColor: theme.primary}}>{cart.length}</span>}
            <span className="text-[9px] font-bold" style={{color: view === 'cart' ? theme.primary : '#9CA3AF'}}>Cart</span>
          </button>

          <button onClick={() => { if(currentUser) { fetchMyOrders(); setView('orders'); } else { alert("Login to view orders"); setView('auth_phone'); } }} className="p-2 flex flex-col items-center gap-1">
            <ClipboardList color={view === 'orders' ? theme.primary : '#9CA3AF'} size={20} /> 
            <span className="text-[9px] font-bold" style={{color: view === 'orders' ? theme.primary : '#9CA3AF'}}>Orders</span>
          </button>

          <button onClick={() => setView('profile')} className="p-2 flex flex-col items-center gap-1"><User color={view === 'profile' ? theme.primary : '#9CA3AF'} size={20} /> <span className="text-[9px] font-bold" style={{color: view === 'profile' ? theme.primary : '#9CA3AF'}}>Profile</span></button>
        </nav>
      )}

      {/* Global CSS for standard Inputs and Premium Animations */}
      <style dangerouslySetWidth="100%" dangerouslySetHeight="100%" jsx>{`
        .input-field {
          width: 100%;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          padding: 12px 16px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: #FF3F6C;
        }

        /* 🌟 PREMIUM 1: Liquid Gradient Flow */
        @keyframes liquidFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .btn-premium {
          background: linear-gradient(-45deg, #FF3F6C, #FF758C, #E11B4C, #FF829D);
          background-size: 300% 300%;
          animation: liquidFlow 4s ease infinite;
        }

        /* 🌟 PREMIUM 2: Breathing Shadow (Glow) */
        @keyframes breatheShadow {
          0%, 100% { box-shadow: 0 5px 15px rgba(255, 63, 108, 0.3); }
          50% { box-shadow: 0 15px 25px rgba(255, 63, 108, 0.6); transform: translateY(-1px); }
        }
        .glow-effect {
          animation: breatheShadow 2.5s ease-in-out infinite;
        }

        /* 🌟 PREMIUM 3: Heartbeat Cart Icon */
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.15) rotate(-5deg); }
          30% { transform: scale(1); }
          45% { transform: scale(1.15) rotate(5deg); }
          60% { transform: scale(1); }
        }
        .icon-heartbeat {
          animation: heartbeat 2s infinite;
        }
      `}</style>        
      
    </div>
  );
}