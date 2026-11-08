import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserRound, Trash2 } from 'lucide-react';

export default function CardAutorizacoes({ autorizacoes, onAutorizar, onRevogar }) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const enviar = async () => {
    setErro(''); setAviso('');
    if (!email.trim()) return setErro('Informe o e-mail do usuário.');
    setEnviando(true);
    try {
      const mensagem = await onAutorizar(email.trim());
      setAviso(mensagem);
      setEmail('');
    } catch (e) { setErro(e.response?.data?.error || e.message); }
    finally { setEnviando(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><UserRound className="w-4 h-4" /> Quem pode ver minhas operações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Autorize outros usuários a acompanhar suas operações. Eles veem os identificadores completos, com os mesmos dados e totais, e podem editar e encerrar as operações abertas.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="E-mail do usuário"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:max-w-[280px]"
          />
          <Button onClick={enviar} disabled={enviando} className="min-h-[44px]">{enviando ? 'Autorizando...' : 'Autorizar'}</Button>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        {aviso && <p className="text-sm text-emerald-600">{aviso}</p>}

        <div className="divide-y divide-border border rounded-lg overflow-hidden">
          {autorizacoes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma autorização concedida ainda.</p>
          ) : autorizacoes.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.visualizador_nome || a.visualizador_email}</p>
                <p className="text-xs text-muted-foreground truncate">{a.visualizador_email}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => onRevogar(a.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Revogar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}