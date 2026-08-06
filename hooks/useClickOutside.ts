import { useEffect, RefObject } from 'react';

/**
 * Hook customizado para detectar cliques fora de um elemento DOM de referência (modal/card)
 * e o pressionamento da tecla Escape.
 *
 * @param ref RefObject do elemento interno (card do modal)
 * @param handler Callback para fechar o modal
 * @param active Booleano opcional para ativar/desativar o listener (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent | KeyboardEvent) => void,
  active: boolean = true
) {
  useEffect(() => {
    if (!active) return;

    const handleClick = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler(event);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, handler, active]);
}
