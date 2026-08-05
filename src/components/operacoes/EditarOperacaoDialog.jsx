import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIAS = ['ACAO', 'CALL', 'PUT', 'DOLLAR'];
const OPERACOES = ['COMPRA', 'VENDA'];

export default function EditarOperacaoDialog({ operacao, onClose, onSubmit }) {
  const [ativo, setAtivo] = useState('');
  const [categoria, setCategoria] = useState('ACAO');
  const [operacaoField, setOperacaoField] = useState('COMPRA');
  const [quantidade, setQuantidade] = useState('');
  const [preco, setPreco] = useState('');
  const [dataAbertura, setDataAbertura] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (operacao) {
      setAtivo(operacao.ativo || '');
      setCategoria(operacao.categoria || 'ACAO');
      setOperacaoField(operacao.operacao || 'COMPRA');
      setQuantidade(String(operacao.quantidade ?? ''));
      setPreco(String(operacao.preco_entrada ?? ''));
      setDataAbertura(operacao.data_abertura ? operacao.data_abertura.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setErr('');
    }
  }, [operacao]);

  const submit = () => {
    const a = ativo.trim().toUpperCase();
    if (a.length < 4 || a.length > 8) return setErr('Ativo deve ter de 4 a 8 caracteres.');
    const q = Number(quantidade);
    const p = Number(preco);
    if (!q || q <= 0) return setErr('Quantidade inválida.');
    if (!p || p <= 0) return setErr('Preço de entrada inválido.');
    if (!dataAbertura) return setErr('Data de abertura inválida.');
    onSubmit({ ativo: a, categoria, operacao: operacaoField, quantidade: q, precoEntrada: p, dataAbertura });
  };

  return (
    <Dialog open={!!operacao} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar Operação {operacao?.ativo}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Ativo</Label>
            <Input value={ativo} onChange={(e) => setAtivo(e.target.value.toUpperCase())} className="uppercase" maxLength={8} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operação</Label>
              <Select value={operacaoField} onValueChange={setOperacaoField}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OPERACOES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantidade</Label><Input type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div>
            <div><Label>Preço de Entrada</Label><Input type="number" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
          </div>
          <div>
            <Label>Data de Abertura</Label>
            <Input type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}