import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Send, MessageSquare, Megaphone } from 'lucide-react';
import { isGestor } from '@/lib/access';

export default function Mensagens() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [para, setPara] = useState('');
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const admin = isGestor(user);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.Mensagem.list('-created_date', 200);
      setMessages(res);
      if (admin) {
        const us = await base44.entities.User.list();
        setUsers(us.filter((u) => u.id !== user.id));
      }
    } catch (e) { console.error('load mensagens', e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const p = params.get('para');
    if (p) setPara(p);
    else setPara(admin ? '' : 'GESTOR');
  }, [params, admin]);

  const send = async () => {
    if (!texto.trim() || !para) return;
    setSending(true);
    try {
      let paraId = para;
      let paraNome = '';
      if (admin) {
        if (para === 'ALL') { paraNome = 'Todos'; }
        else { const u = users.find((x) => x.id === para); paraNome = u?.email || para; }
      } else {
        paraId = 'GESTOR'; paraNome = 'Gestor de Suporte';
      }
      await base44.entities.Mensagem.create({ para_id: paraId, para_nome: paraNome, texto: texto.trim() });
      setTexto('');
      load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
    setSending(false);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  const labelOf = (m) => {
    const mine = m.created_by_id === user.id;
    if (mine) return { tag: `Para: ${m.para_nome || m.para_id}`, cls: 'bg-primary/10 text-primary' };
    if (admin) return { tag: `De: ${m.created_by || 'usuário'}`, cls: 'bg-muted' };
    if (m.para_id === 'ALL') return { tag: 'Aviso geral', cls: 'bg-amber-100 text-amber-700' };
    return { tag: 'Gestor de Suporte', cls: 'bg-purple-100 text-purple-700' };
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> Mensagens
          </h1>
          <p className="text-sm text-muted-foreground">
            {admin ? 'Comunique-se com os usuários individualmente ou em massa.' : 'Envie mensagens ao Gestor de Suporte e receba avisos.'}
          </p>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Destinatário</label>
              {admin ? (
                <Select value={para} onValueChange={setPara}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL"><span className="flex items-center gap-2"><Megaphone className="w-4 h-4" /> Todos os usuários</span></SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 rounded-md border bg-muted text-sm">Gestor de Suporte</div>
              )}
            </div>
            <Textarea
              placeholder="Digite sua mensagem..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
            />
            <Button onClick={send} disabled={sending || !texto.trim() || !para} className="w-full">
              {sending ? 'Enviando...' : <><Send className="w-4 h-4 mr-2" /> Enviar</>}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-heading font-semibold">Histórico</h2>
          {loading && <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem ainda.</p>
          )}
          {messages.map((m) => {
            const l = labelOf(m);
            const mine = m.created_by_id === user.id;
            return (
              <Card key={m.id} className={mine ? 'border-primary/30' : ''}>
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded ${l.cls}`}>{l.tag}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(m.created_date)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.texto}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}