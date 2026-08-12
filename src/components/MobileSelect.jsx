import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function MobileSelect({ value, onValueChange, options, placeholder = 'Selecionar' }) {
  const isMobile = useIsMobile();
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const currentLabel = opts.find((o) => o.value === value)?.label || placeholder;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" type="button" className="w-full justify-between min-h-[44px] font-normal">
          {currentLabel}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>{placeholder}</DrawerTitle></DrawerHeader>
        <div className="px-4 pb-6 space-y-1">
          {opts.map((o) => (
            <Button
              key={o.value}
              variant={o.value === value ? 'default' : 'ghost'}
              type="button"
              className="w-full justify-start min-h-[44px]"
              onClick={() => onValueChange(o.value)}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}