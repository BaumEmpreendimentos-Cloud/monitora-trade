import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIAS = ['ACAO', 'CALL', 'PUT', 'DOLLAR'];
const OPERACOES = ['COMPRA', 'VENDA'];
const isOption = (c) => c === 'CALL' || c === 'PUT';

export default function OperacaoForm({ open, onClose, grupos, onSubmit }) {
  const [identificador, setIdentificador] = useState('');
  const [ativo, setAtivo] = useState('');
  const [ativoBase, setAtivoBase] = useState('');
  const [categoria, setCategoria] = useState('ACAO');
  const [operacao, setOperacao] = useState('COMPRA');
  const [quantidade, setQuantidade] = useState('');
  const [preco, setPreco] = useState('');
  const [dataAbertura, setDataAbertura] = useState('');
  const [strike, setStrike] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setIdentificador(''); setAtivo(''); setAtivoBase(''); setCategoria('ACAO');
      setOperacao('COMPRA'); setQuantidade(''); setPreco('');
      setDataAbertura(new Date().toISOString().slice(0, 10));
      setStrike(''); setVencimento(''); setErr('');
    }
  }, [open]);

  const submit = () => {
    const a = ativo.trim().toUpperCase();
    if (a.length < 4 || a.length > 8) return setErr('Ativo deve ter de 4 a 8 caracteres.');
    const q = Number(quantidade);
    const p = Number(preco);
    if (!q || q <= 0) return setErr('Quantidade inválida.');
    if (!p || p <= 0) return setErr('Preço de entrada inválido.');
    if (!dataAbertura) return setErr('Data de abertura inválida.');
    const opt = isOption(categoria);
    let strikeVal, vencVal, baseVal;
    if (opt) {
      strikeVal = Number(strike);
      if (!strikeVal || strikeVal <= 0) return setErr('Strike inválido para opção.');
      if (!vencimento) return setErr('Data de vencimento obrigatória para opção.');
      vencVal = vencimento;
      baseVal = ativoBase.trim().toUpperCase();
      if (!baseVal) return setErr('Ativo base (underlying) obrigatório para opção.');
    }
    const nome = identificador.trim() || `OP-${(grupos.length || 0) + 1}`;
    onSubmit({ identificador: nome, ativo: a, ativo_base: baseVal, categoria, operacao, quantidade: q, precoEntrada: p, dataAbertura, strike: strikeVal, vencimento: vencVal });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Operação</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Identificador</Label>
            <Input
              list="grupos-list"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Nome do identificador (vazio = automático)"
            />
            <datalist id="grupos-list">
              {grupos.map((g) => <option key={g.id} value={g.nome} />)}
            </datalist>
          </div>
          <div>
            <Label>Ativo</Label>
            <Input value={ativo} onChange={(e) => setAtivo(e.target.value.toUpperCase())} placeholder="PETR4" className="uppercase" maxLength={8} />
          </div>
          {isOption(categoria) && (
            <div>
              <Label>Ativo base (underlying)</Label>
              <Input value={ativoBase} onChange={(e) => setAtivoBase(e.target.value.toUpperCase())} placeholder="PETR4" className="uppercase" maxLength={8} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operação</Label>
              <Select value={operacao} onValueChange={setOperacao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERACOES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isOption(categoria) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Strike</Label>
                <Input type="number" step="0.01" value={strike} onChange={(e) => setStrike(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantidade</Label>
              <Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div>
              <Label>Preço de Entrada</Label>
              <Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Data de Abertura</Label>
            <Input type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Abrir Operação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}