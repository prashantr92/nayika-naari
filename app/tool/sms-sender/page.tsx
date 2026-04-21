"use client";

import React, { useState } from 'react';
import { Send, Users, MessageSquare, Globe, Smartphone, CheckCircle2, AlertCircle, PlayCircle, Server, Plus, Trash2 } from 'lucide-react';
import { sendSmsViaPhone } from './actions'; 

export default function WebBulkSender() {
  const [rawNumbers, setRawNumbers] = useState("");
  const [message, setMessage] = useState("");
  const [sendMode, setSendMode] = useState<'whatsapp' | 'localApi'>('localApi');
  
  // 🌟 NAYA: Ek IP ki jagah ab Array of Phones banega
  const [phones, setPhones] = useState([{ id: 1, ip: "192.168.1.3:8080" }]);
  
  const [logs, setLogs] = useState<{num: string, status: string}[]>([]);
  const [isSending, setIsSending] = useState(false);

  const processNumbers = () => {
    if (!rawNumbers) return [];
    const splitArr = rawNumbers.split(/[\n, ]+/);
    return [...new Set(splitArr.map(n => n.replace(/\D/g, '')).filter(n => n.length >= 10).map(n => n.slice(-10)))];
  };

  const validNumbersList = processNumbers();

  // Phone list manage karne ke functions
  const addPhone = () => setPhones([...phones, { id: Date.now(), ip: "192.168.1." }]);
  const removePhone = (id: number) => setPhones(phones.filter(p => p.id !== id));
  const updatePhone = (id: number, val: string) => setPhones(phones.map(p => p.id === id ? { ...p, ip: val } : p));

 const handleLocalApiSend = async () => {
    const validPhones = phones.filter(p => p.ip.length > 10);
    if (validPhones.length === 0) return alert("Please add at least one valid Phone IP!");
    if (!message) return alert("Please enter a message!");
    
    setIsSending(true);

    let currentPhoneIndex = 0;
    // Har phone ne kitne SMS bheje, uska record rakhenge
    let phoneSendCounts = new Array(validPhones.length).fill(0);

    for (let i = 0; i < validNumbersList.length; i++) {
      const num = validNumbersList[i];
      let isMessageSent = false;

      // Jab tak SMS send nahi hota aur active phones bache hain, loop chalega
      while (!isMessageSent && currentPhoneIndex < validPhones.length) {
        const currentPhone = validPhones[currentPhoneIndex];

        // 🌟 CHECK 1: Agar is phone ne 100 SMS bhej diye hain, toh agle par switch karo
        if (phoneSendCounts[currentPhoneIndex] >= 100) {
          addLog("SYSTEM", `🔄 P${currentPhoneIndex + 1} limit reached. Auto-Switching...`);
          currentPhoneIndex++;
          continue; 
        }

        addLog(num, `Connecting P${currentPhoneIndex + 1}...`);

        try {
          const result = await sendSmsViaPhone(currentPhone.ip, `+91${num}`, message);

          if (result.success) {
            addLog(num, `✅ Sent via P${currentPhoneIndex + 1}`);
            phoneSendCounts[currentPhoneIndex]++; // Success count badha do
            isMessageSent = true; // 🌟 SMS chala gaya, while loop break kar do
          } else {
            // 🌟 CHECK 2: Phone ne error diya (SIM balance khatam ya reject kiya)
            addLog(num, `⚠️ P${currentPhoneIndex + 1} Failed. Auto-Switching to next...`);
            currentPhoneIndex++; // Agle phone par shift ho jao
          }
        } catch (error) {
          // 🌟 CHECK 3: Phone WiFi se disconnect ho gaya ya Switch off ho gaya
          addLog(num, `❌ P${currentPhoneIndex + 1} Offline/Dead. Auto-Switching...`);
          currentPhoneIndex++; // Agle phone par shift ho jao
        }
      }

      // Agar saare phones try kar liye par kisi se nahi gaya
      if (!isMessageSent) {
        addLog(num, `🚫 Failed: All phones dead or daily limits reached.`);
        break; // Campaign rok do kyunki aage try karne ka fayda nahi
      }
      
      // Anti-ban delay: Har SMS ke baad 2 second ka aaram
      await new Promise(res => setTimeout(res, 2000));
    }
    
    addLog("SYSTEM", "🎉 Campaign Finished!");
    setIsSending(false);
  };

  const addLog = (num: string, status: string) => {
    setLogs(prev => {
      const exists = prev.findIndex(l => l.num === num);
      if (exists >= 0) {
        const newLogs = [...prev];
        newLogs[exists] = { num, status };
        return newLogs;
      }
      return [{ num, status }, ...prev];
    });
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-y-auto bg-[#F8FAFC] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-full">
        
        {/* LEFT PANEL */}
        <div className="w-full lg:w-7/12 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            
            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                  <Globe className="text-blue-400" /> Web Marketing Hub
                </h1>
                <p className="text-slate-400 text-sm mt-1">Multi-Node SMS Gateway Architecture</p>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              
              <div>
                <label className="text-sm font-bold text-slate-700 mb-3 block uppercase tracking-wider">Choose Delivery Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => setSendMode('whatsapp')} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${sendMode === 'whatsapp' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                    <MessageSquare size={24} className={sendMode === 'whatsapp' ? 'text-green-500' : ''} />
                    <span className="font-bold text-sm">WhatsApp Web</span>
                  </div>
                  
                  <div onClick={() => setSendMode('localApi')} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${sendMode === 'localApi' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                    <Smartphone size={24} className={sendMode === 'localApi' ? 'text-blue-500' : ''} />
                    <span className="font-bold text-sm">Multi-Phone WiFi</span>
                  </div>
                </div>
              </div>

              {/* 🌟 NAYA: MULTI-PHONE UI */}
              {sendMode === 'localApi' && (
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-blue-900">
                      <Server size={16} /> Connected Phone Nodes
                    </label>
                    <button onClick={addPhone} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm">
                      <Plus size={14} /> Add Phone
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {phones.map((phone, i) => (
                      <div key={phone.id} className="flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-800 font-black text-xs px-2 py-1.5 rounded">P{i + 1}</span>
                        <input 
                          type="text" 
                          value={phone.ip} 
                          onChange={(e) => updatePhone(phone.id, e.target.value)} 
                          placeholder="192.168.1.X:8080" 
                          className="flex-1 p-2.5 border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-white" 
                        />
                        {phones.length > 1 && (
                          <button onClick={() => removePhone(phone.id)} className="text-red-400 hover:text-red-600 p-2 bg-white rounded-xl border border-red-100">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200/50 flex justify-between items-center text-[11px] font-bold">
                    <span className="text-blue-600">Total Capacity: {phones.length * 100} SMS / day</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Users size={16} className="text-indigo-500" /> Target Numbers
                    </label>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                      Valid: {validNumbersList.length}
                    </span>
                  </div>
                  <textarea rows={6} value={rawNumbers} onChange={(e) => setRawNumbers(e.target.value)} placeholder="Paste mobile numbers here..." className="w-full p-4 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 custom-scrollbar" />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <MessageSquare size={16} className="text-pink-500" /> Message Content
                  </label>
                  <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type promotional offer..." className="w-full p-4 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-pink-500 outline-none bg-slate-50 custom-scrollbar" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Execution Logs */}
        <div className="w-full lg:w-5/12 space-y-6 pb-10">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col h-full min-h-[600px]">
            
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <PlayCircle size={22} className="text-slate-400" /> Execution Center
            </h3>

            {validNumbersList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center space-y-3">
                <Users size={48} className="opacity-20" />
                <p className="text-sm">Add valid numbers to start execution.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                {sendMode === 'localApi' && (
                  <div className="flex flex-col h-full">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 mb-6">
                      <Smartphone size={20} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800 font-medium leading-relaxed">
                        Dashboard will automatically assign 100 numbers to each connected phone. Sending 1 SMS every 2 seconds.
                      </p>
                    </div>

                    <button 
                      onClick={handleLocalApiSend}
                      disabled={isSending}
                      className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex justify-center items-center gap-2 mb-6 ${isSending ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-95'}`}
                    >
                      {isSending ? 'TRANSMITTING TO PHONES...' : `⚡ START SENDING TO ${validNumbersList.length} NUMBERS`}
                    </button>

                    <div className="flex-1 bg-slate-900 rounded-2xl p-5 overflow-y-auto font-mono text-xs custom-scrollbar min-h-[300px]">
                      {logs.length === 0 ? (
                        <span className="text-slate-600">Awaiting execution...</span>
                      ) : (
                        <div className="space-y-2">
                          {logs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-slate-400">{log.num}</span>
                              <span className={log.status.includes('✅') ? 'text-green-400' : log.status.includes('❌') ? 'text-red-400' : 'text-blue-400'}>{log.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}