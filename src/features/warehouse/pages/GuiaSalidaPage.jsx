import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Button,
  VStack,
  HStack,
  useToast,
  Icon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge,
} from '@chakra-ui/react';
import { SearchIcon, CheckCircleIcon, CloseIcon } from '@chakra-ui/icons';
import { MdLocalShipping, MdInventory, MdAssignment, MdLock } from 'react-icons/md';
import { TopHeaderBanner } from '../../../components/TopHeaderBanner';
import { axiosInstance } from '../../../shared/lib/axiosInstance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthStore } from '../../auth/stores/useAuthStore';

// Subcomponentes modulares
import { GuiaDeliveryHeader } from '../components/GuiaDeliveryHeader';
import { Paso1PickingPanel } from '../components/Paso1PickingPanel';
import { Paso2EmbalajePanel } from '../components/Paso2EmbalajePanel';
import { Paso3DespachoPanel } from '../components/Paso3DespachoPanel';
import { ModalEmpaque } from '../components/ModalEmpaque';

export function GuiaSalidaPage() {
  const authUsername = useAuthStore((s) => s.username);
  const usuarioSesion = (authUsername || 'ALMACÉN').toUpperCase();

  // Input de búsqueda NO controlado: el valor vive en el DOM (inputBusquedaRef) para que cada tecla
  // no re-renderice toda la página. Solo re-renderizamos cuando pasa de vacío a con texto (o viceversa).
  const [hasInput, setHasInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState(null);
  const [tabIndex, setTabIndex] = useState(0); // 0: Picking, 1: Embalaje, 2: Despacho
  const toast = useToast();
  const inputBusquedaRef = useRef(null);
  const prevInputValueRef = useRef('');
  const getDocNumInput = () => inputBusquedaRef.current?.value || '';
  const setDocNumInput = (val) => {
    if (inputBusquedaRef.current) inputBusquedaRef.current.value = val;
    prevInputValueRef.current = val;
    setHasInput(!!val);
  };
  const timerBusquedaRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const resetOnNextScanRef = useRef(false);
  const abortControllerRef = useRef(null);
  const isScannerInputRef = useRef(false);
  const fastKeyCountRef = useRef(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputBusquedaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (timerBusquedaRef.current) clearTimeout(timerBusquedaRef.current);
    };
  }, []);

  // 1. Estados de Picking (Almacén)
  const [lineas, setLineas] = useState([]);
  const [responsablePicking, setResponsablePicking] = useState(usuarioSesion);
  const [observacionAlmacen, setObservacionAlmacen] = useState('');
  const [guardandoPicking, setGuardandoPicking] = useState(false);

  // 2. Estados de Embalaje & Pesaje (Packing Dinámico por Cajas)
  const [bultos, setBultos] = useState(1);
  const [cajas, setCajas] = useState([
    { id: 1, bultoNumero: 1, codigoCaja: 'Bulto 1', pesoKg: '', items: [] },
  ]);
  const [modalEmpaqueOpen, setModalEmpaqueOpen] = useState(false);
  const [articuloSeleccionadoEmpaque, setArticuloSeleccionadoEmpaque] = useState(null);
  const [cajaDestinoSeleccionada, setCajaDestinoSeleccionada] = useState(1);
  const [cantidadEmpacarInput, setCantidadEmpacarInput] = useState(1);

  const [pesoKg, setPesoKg] = useState('');
  const [responsablePacking, setResponsablePacking] = useState('');
  const [observacionEmbalaje, setObservacionEmbalaje] = useState('');
  const [guardandoEmbalaje, setGuardandoEmbalaje] = useState(false);

  // Recalcular el peso total balanza sumando los pesos de cada bulto
  const recalcularPesoTotal = (listaCajas) => {
    const pesosValidos = listaCajas
      .map((c) => parseFloat(c.pesoKg))
      .filter((p) => !isNaN(p) && p > 0);

    if (pesosValidos.length > 0) {
      const suma = pesosValidos.reduce((acc, curr) => acc + curr, 0);
      const totalStr = Number.isInteger(suma) ? String(suma) : suma.toFixed(2);
      setPesoKg(totalStr);
    } else {
      setPesoKg('');
    }
  };

  const handleCambioPesoCaja = (cajaId, nuevoPeso) => {
    const updated = cajas.map((c) => {
      if (String(c.id) === String(cajaId)) {
        return { ...c, pesoKg: nuevoPeso };
      }
      return c;
    });
    setCajas(updated);
    recalcularPesoTotal(updated);
  };

  // Sincronizar automáticamente usuario logueado en picking si está vacío
  useEffect(() => {
    if (authUsername) {
      const u = authUsername.toUpperCase();
      setResponsablePicking((prev) => (prev && prev !== 'ALMACÉN' ? prev : u));
    }
  }, [authUsername]);

  // 3. Estados de Control de Despacho (Camión / Rampa)
  const [codigoFactura, setCodigoFactura] = useState('');
  const [codigoPedidoDespacho, setCodigoPedidoDespacho] = useState('');
  const [vehiculoPlaca, setVehiculoPlaca] = useState('');
  const [choferNombre, setChoferNombre] = useState('');
  const [choferLicencia, setChoferLicencia] = useState('');
  const [observacionDespacho, setObservacionDespacho] = useState('');
  const [guardandoDespacho, setGuardandoDespacho] = useState(false);

  const todayStr = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  // Packing (embalaje) de la guía: puede juntar varias guías del mismo cliente y dirección de entrega
  const packing = deliveryData?.packing || null;
  const guiasEmbalaje = packing?.guias?.length ? packing.guias : deliveryData ? [deliveryData] : [];
  // Líneas a embalar de TODAS las guías del packing (cada una identificada por su idDetalle)
  const lineasEmbalaje = guiasEmbalaje.flatMap((g) =>
    (g.detalles || []).map((d) => ({
      idDetalle: d.id,
      docNumEntrega: g.docNumEntrega,
      numeroGuiaInterna: g.numeroGuiaInterna || String(g.docNumEntrega),
      codigoArticulo: d.codigoArticulo,
      nombreProducto: d.nombreProducto,
      unidadMedida: d.unidadMedida || 'NIU',
      cantidadSalida: Number(d.cantidadSalida || 0),
    }))
  );
  const [candidatasPacking, setCandidatasPacking] = useState([]);
  const [agregandoGuia, setAgregandoGuia] = useState(false);

  // Por línea de guía (idDetalle) y no por código: con varias guías el mismo código puede repetirse
  const getCantidadEmpacada = (idDetalle) => {
    return cajas.reduce((total, c) => {
      const match = c.items?.find((it) => it.idDetalle === idDetalle);
      return total + (match ? Number(match.cantidad || 0) : 0);
    }, 0);
  };

  const getCantidadPendiente = (linea) => {
    const aprobada = Number(linea.cantidadSalida || 0);
    const empacada = getCantidadEmpacada(linea.idDetalle);
    return Math.max(0, aprobada - empacada);
  };

  const handleCrearNuevaCaja = () => {
    const nextNum = cajas.length + 1;
    const newBox = {
      id: Date.now(),
      bultoNumero: nextNum,
      codigoCaja: `Bulto ${nextNum}`,
      pesoKg: '',
      items: [],
    };
    const updated = [...cajas, newBox];
    setCajas(updated);
    setBultos(updated.length);
    setCajaDestinoSeleccionada(newBox.id);
    toast({
      title: `Caja creada: Bulto ${nextNum}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleEliminarCaja = (cajaId) => {
    if (cajas.length <= 1) {
      toast({
        title: 'Acción no permitida',
        description: 'Debe existir al menos 1 caja para el embalaje.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const updated = cajas
      .filter((c) => String(c.id) !== String(cajaId))
      .map((c, idx) => ({
        ...c,
        bultoNumero: idx + 1,
        codigoCaja: `Bulto ${idx + 1}`,
      }));
    setCajas(updated);
    setBultos(updated.length);
    const ultimoBulto = updated[updated.length - 1];
    setCajaDestinoSeleccionada(ultimoBulto?.id || 1);
    recalcularPesoTotal(updated);
  };

  const handleAbrirModalEmpaque = (linea, cajaIdPreferida = null) => {
    const pend = getCantidadPendiente(linea);
    if (pend <= 0) {
      toast({
        title: 'Ítem completo',
        description: `Todas las unidades aprobadas de ${linea.codigoArticulo} ya están en cajas.`,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    setArticuloSeleccionadoEmpaque(linea);
    setCantidadEmpacarInput(pend);
    if (cajaIdPreferida) {
      setCajaDestinoSeleccionada(cajaIdPreferida);
    } else {
      // Siempre seleccionar por defecto el último bulto creado
      const ultimoBulto = cajas[cajas.length - 1];
      setCajaDestinoSeleccionada(ultimoBulto?.id || 1);
    }
    setModalEmpaqueOpen(true);
  };

  const handleConfirmarEmpaque = () => {
    if (!articuloSeleccionadoEmpaque) return;
    const pend = getCantidadPendiente(articuloSeleccionadoEmpaque);
    let qty = Number(cantidadEmpacarInput);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Cantidad no válida', status: 'warning', duration: 2000 });
      return;
    }
    if (qty > pend) qty = pend;

    let currentCajas = [...cajas];
    let targetId = cajaDestinoSeleccionada;

    if (String(targetId) === 'NUEVA_CAJA') {
      const nextNum = currentCajas.length + 1;
      const newBox = {
        id: Date.now(),
        bultoNumero: nextNum,
        codigoCaja: `Bulto ${nextNum}`,
        pesoKg: '',
        items: [],
      };
      currentCajas.push(newBox);
      targetId = newBox.id;
    }

    const cIdx = currentCajas.findIndex((c) => String(c.id) === String(targetId));
    if (cIdx === -1) return;

    const targetCaja = { ...currentCajas[cIdx] };
    const itemIdx = targetCaja.items.findIndex(
      (it) => it.idDetalle === articuloSeleccionadoEmpaque.idDetalle
    );

    if (itemIdx >= 0) {
      const existing = targetCaja.items[itemIdx];
      targetCaja.items[itemIdx] = {
        ...existing,
        cantidad: Number(existing.cantidad) + qty,
      };
    } else {
      targetCaja.items = [
        ...targetCaja.items,
        {
          idDetalle: articuloSeleccionadoEmpaque.idDetalle,
          docNumEntrega: articuloSeleccionadoEmpaque.docNumEntrega,
          codigoArticulo: articuloSeleccionadoEmpaque.codigoArticulo,
          nombreProducto: articuloSeleccionadoEmpaque.nombreProducto,
          unidadMedida: articuloSeleccionadoEmpaque.unidadMedida,
          cantidad: qty,
        },
      ];
    }

    currentCajas[cIdx] = targetCaja;
    setCajas(currentCajas);
    setBultos(currentCajas.length);
    setModalEmpaqueOpen(false);
    setArticuloSeleccionadoEmpaque(null);

    toast({
      title: '¡Producto ingresado a la caja!',
      description: `${qty} und. de ${articuloSeleccionadoEmpaque.codigoArticulo} en ${targetCaja.codigoCaja}.`,
      status: 'success',
      duration: 2500,
      isClosable: true,
    });
  };

  const handleRemoverItemDeCaja = (cajaId, idDetalle) => {
    setCajas((prev) =>
      prev.map((c) => {
        if (String(c.id) !== String(cajaId)) return c;
        return {
          ...c,
          items: c.items.filter((it) => it.idDetalle !== idDetalle),
        };
      })
    );
  };

  const handleEmpacarTodoEnUnSoloBulto = () => {
    const todosLosItems = lineasEmbalaje
      .filter((l) => Number(l.cantidadSalida || 0) > 0)
      .map((l) => ({
        idDetalle: l.idDetalle,
        docNumEntrega: l.docNumEntrega,
        codigoArticulo: l.codigoArticulo,
        nombreProducto: l.nombreProducto,
        unidadMedida: l.unidadMedida,
        cantidad: Number(l.cantidadSalida || 0),
      }));

    if (todosLosItems.length === 0) {
      toast({
        title: 'Sin ítems para empacar',
        description: 'No hay productos con cantidad aprobada de salida.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const cajaUnica = [
      {
        id: 1,
        bultoNumero: 1,
        codigoCaja: 'Bulto 1',
        items: todosLosItems,
      },
    ];

    setCajas(cajaUnica);
    setBultos(1);
    setCajaDestinoSeleccionada(1);

    toast({
      title: '📦 ¡Todo colocado en 1 solo bulto!',
      description: `Se ingresaron los ${todosLosItems.length} ítems aprobados directamente al Bulto 1.`,
      status: 'success',
      duration: 3500,
      isClosable: true,
    });
  };

  const cajaVacia = () => ({ id: 1, bultoNumero: 1, codigoCaja: 'Bulto 1', pesoKg: '', items: [] });

  // Cajas de la pantalla a partir de las cajas guardadas en el packing
  const cajasDesdePacking = (p) => {
    if (!p?.bultos?.length) return [cajaVacia()];
    return p.bultos.map((b, idx) => ({
      id: b.id || idx + 1,
      bultoNumero: b.numeroBulto || idx + 1,
      codigoCaja: `Bulto ${b.numeroBulto || idx + 1}`,
      pesoKg: b.pesoKg !== null && b.pesoKg !== undefined ? String(b.pesoKg) : '',
      items: (b.items || []).map((it) => ({
        idDetalle: it.idDetalle,
        docNumEntrega: it.docNumEntrega,
        codigoArticulo: it.codigoArticulo,
        nombreProducto: it.nombreProducto,
        unidadMedida: it.unidadMedida,
        cantidad: Number(it.cantidad || 0),
      })),
    }));
  };

  const sincronizarDatosFormulario = (d) => {
    setDeliveryData(d);

    // Normalizar líneas de detalle
    const items = (d.detalles || d.lineas || []).map((l) => ({
      id: l.id || null,
      lineNumSap: l.lineNumSap ?? l.lineNum ?? 0,
      codigoArticulo: l.codigoArticulo || '',
      nombreProducto: l.nombreProducto || '',
      unidadMedida: l.unidadMedida || 'NIU',
      cantidadPedida: Number(l.cantidadPedida || 0),
      cantidadSalida: Math.min(Number(l.cantidadSalida ?? l.cantidadPedida ?? 0), Number(l.cantidadPedida || 0)),
      numeroBulto: Number(l.numeroBulto || 1),
      observacion: l.observacion || '',
    }));
    setLineas(items);

    // Datos de Almacén (picking)
    setResponsablePicking(d.responsablePicking || usuarioSesion);

    // Embalaje: vive en el packing (puede juntar varias guías del mismo cliente y dirección)
    const p = d.packing || null;
    setPesoKg(p?.pesoTotalKg !== null && p?.pesoTotalKg !== undefined ? String(p.pesoTotalKg) : '');
    setResponsablePacking(p?.responsablePacking || '');
    setObservacionEmbalaje(p?.observacion || '');
    const cajasCargadas = cajasDesdePacking(p);
    setCajas(cajasCargadas);
    setBultos(cajasCargadas.length);

    // Observación de picking (las guías antiguas guardaban aquí el JSON de cajas)
    let obsTexto = d.observacionAlmacen || d.comentariosSap || d.referenciaSap || '';
    if (obsTexto.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(obsTexto);
        obsTexto = parsed.observacionPicking || parsed.observacionAlmacen || d.comentariosSap || d.referenciaSap || '';
      } catch {
        // No era JSON: se deja el texto tal cual
      }
    }
    setObservacionAlmacen(obsTexto);

    // Datos de Factura y Pedido
    setCodigoFactura(d.despacho?.codigoFactura || d.codigoFactura || '');
    const pedidosGuias = Array.from(new Set((p?.guias?.length ? p.guias : [d]).map((g) => g.codigoPedido).filter(Boolean)));
    setCodigoPedidoDespacho(d.despacho?.codigoPedido ? String(d.despacho.codigoPedido) : pedidosGuias.join(', '));

    // Datos de Despacho
    if (d.despacho) {
      setVehiculoPlaca(d.despacho.vehiculoPlaca || '');
      setChoferNombre(d.despacho.choferNombre || '');
      setChoferLicencia(d.despacho.choferLicencia || '');
      setObservacionDespacho(d.despacho.observacion || '');
    } else {
      setVehiculoPlaca('');
      setChoferNombre('');
      setChoferLicencia('');
      setObservacionDespacho('');
    }

    // Navegación automática a pestaña correspondiente según estado
    if (d.estado === 'DESPACHADA' || p?.estado === 'DESPACHADO' || p?.estado === 'CERRADO') {
      setTabIndex(2);
    } else if (d.estado === 'VALIDADA' || d.estado === 'OBSERVADA') {
      setTabIndex(1);
    } else {
      setTabIndex(0);
    }
  };

  const handleLimpiarBusqueda = () => {
    if (timerBusquedaRef.current) {
      clearTimeout(timerBusquedaRef.current);
    }
    setDocNumInput('');
    setDeliveryData(null);
    setLineas([]);
    setCajas([]);
    setBultos(0);
    setPesoKg('');
    setObservacionAlmacen('');
    setObservacionEmbalaje('');
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
  };

  const ejecutarBusqueda = async (codigoDirecto = null) => {
    const rawVal = codigoDirecto !== null && codigoDirecto !== undefined ? String(codigoDirecto) : getDocNumInput();
    const cleanNum = rawVal.trim().replace(/^0+/, '') || rawVal.trim();
    if (!cleanNum) {
      toast({
        title: 'Ingresa un número',
        description: 'Por favor escribe o escanea el número de Entrega SAP (ej: 000021535).',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (timerBusquedaRef.current) {
      clearTimeout(timerBusquedaRef.current);
    }

    // Cancelar cualquier petición en vuelo previa
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const res = await axiosInstance.get(`/warehouseModule/guias-salida/sap/${cleanNum}`, {
        signal: controller.signal,
      });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        sincronizarDatosFormulario(d);
        resetOnNextScanRef.current = true;
        // Dejar el código seleccionado y con foco: el siguiente escaneo lo reemplaza directamente
        setTimeout(() => {
          inputBusquedaRef.current?.focus();
          inputBusquedaRef.current?.select();
        }, 100);

        toast({
          title: res.data.origen === 'BASE_DE_DATOS_LOCAL' ? '⚡ Guía cargada de BD (<15ms)' : '🚀 Entrega consultada en SAP',
          description: `Guía ${d.numeroGuiaInterna} con estado: ${d.estado}`,
          status: 'success',
          duration: 2500,
          isClosable: true,
        });
      } else {
        toast({
          title: 'No encontrado',
          description: `No se encontró la Entrega #${cleanNum} en SAP`,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return; // Petición previa cancelada, ignorar
      }
      console.error(err);
      toast({
        title: 'Error de búsqueda',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter = fin del código: lo manda la pistola automáticamente o el usuario al escribir a mano.
    // Algunas pistolas vienen configuradas con Tab como sufijo: si venía de pistola, Tab también busca.
    if (e.key === 'Enter' || (e.key === 'Tab' && isScannerInputRef.current)) {
      if (timerBusquedaRef.current) clearTimeout(timerBusquedaRef.current);
      isScannerInputRef.current = false;
      fastKeyCountRef.current = 0;
      handleBuscar(e);
      return;
    }

    const now = Date.now();
    const diff = now - lastKeyTimeRef.current;

    // Detectar pistola de código de barras: caracteres entran a velocidad sobrehumana (<45ms entre teclas)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (diff < 45) {
        fastKeyCountRef.current += 1;
        if (fastKeyCountRef.current >= 2) {
          isScannerInputRef.current = true;
        }
      } else {
        fastKeyCountRef.current = 0;
        isScannerInputRef.current = false;
      }
    }

    // Tras una búsqueda exitosa, la primera tecla del siguiente código reemplaza el anterior.
    // (No se limpia por pausas entre teclas: eso borraba lo que el usuario escribía a mano.)
    if (resetOnNextScanRef.current && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      resetOnNextScanRef.current = false;
      // Solo limpiar el DOM: la tecla que viene vuelve a llenarlo, así evitamos 2 renders por escaneo
      if (inputBusquedaRef.current) inputBusquedaRef.current.value = '';
      prevInputValueRef.current = '';
      fastKeyCountRef.current = 0;
      isScannerInputRef.current = false;
    }
    lastKeyTimeRef.current = now;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const prevLength = prevInputValueRef.current.length;
    prevInputValueRef.current = val;
    setHasInput(!!val);

    if (timerBusquedaRef.current) {
      clearTimeout(timerBusquedaRef.current);
    }

    const clean = val.trim();
    // Detectar si fue pegado de golpe o ráfaga de pistola
    const isBulk = val.length - prevLength >= 4;
    const isFromScanner = isScannerInputRef.current || isBulk;

    // Respaldo para pistolas SIN sufijo Enter (o texto pegado): buscar cuando dejan de llegar caracteres.
    // Normalmente la pistola manda Enter y esto ni llega a dispararse (Enter cancela el timer).
    // Si es escritura manual tecla por tecla: NO cortar la escritura, espera a Enter o clic en Buscar.
    if (isFromScanner && clean.length >= 4) {
      timerBusquedaRef.current = setTimeout(() => {
        ejecutarBusqueda(getDocNumInput());
        isScannerInputRef.current = false;
        fastKeyCountRef.current = 0;
      }, 300);
    }
  };

  const handleBuscar = (e) => {
    if (e) e.preventDefault();
    if (timerBusquedaRef.current) {
      clearTimeout(timerBusquedaRef.current);
    }
    ejecutarBusqueda(getDocNumInput());
  };

  const handleCambioCantidadSalida = (index, valor) => {
    setLineas((prev) => {
      const copy = [...prev];
      const linea = copy[index];
      const maxPedida = Number(linea.cantidadPedida) || 0;
      let val = Number(valor);
      if (isNaN(val) || val < 0) val = 0;

      if (val > maxPedida) {
        val = maxPedida;
        toast({
          title: 'Límite alcanzado',
          description: `No puedes colocar más de lo solicitado en el pedido SAP (${maxPedida} ${linea.unidadMedida}).`,
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }

      copy[index] = { ...linea, cantidadSalida: val };
      return copy;
    });
  };

  const handleValidarPicking = async () => {
    if (!deliveryData?.docNumEntrega) return;

    const tieneDiferencia = lineas.some((l) => l.cantidadSalida < l.cantidadPedida);
    if (tieneDiferencia && (!observacionAlmacen || observacionAlmacen.trim().length === 0)) {
      toast({
        title: 'Opinión requerida por faltantes',
        description: 'Hay productos con cantidades menores a lo pedido. Por favor deja la explicación de almacén.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setGuardandoPicking(true);
    try {
      const payload = {
        lineas: lineas.map((l) => ({
          lineNumSap: l.lineNumSap,
          cantidadSalida: l.cantidadSalida,
          numeroBulto: l.numeroBulto,
          observacion: l.observacion,
        })),
        bultosTotal: Number(bultos) || 1,
        pesoTotalKg: pesoKg ? Number(pesoKg) : null,
        responsablePicking: responsablePicking.trim(),
        observacionAlmacen,
        tieneDiferencia,
      };

      const res = await axiosInstance.post(
        `/warehouseModule/guias-salida/${deliveryData.docNumEntrega}/validar-picking`,
        payload
      );

      if (res.data?.success && res.data?.data) {
        sincronizarDatosFormulario(res.data.data);
        toast({
          title: tieneDiferencia ? '⚠️ Picking con Observaciones Guardado' : '✅ Picking Validado con Éxito',
          description: 'Mercadería verificada en almacén. Procede con el embalaje en el Paso 2.',
          status: tieneDiferencia ? 'warning' : 'success',
          duration: 4000,
          isClosable: true,
        });
        setTabIndex(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast({
        title: 'Error al validar picking',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setGuardandoPicking(false);
    }
  };

  // El packing nuevo (o actualizado) reemplaza al anterior en la guía mostrada
  const aplicarPacking = (nuevoPacking) => {
    setDeliveryData((prev) => (prev ? { ...prev, packing: nuevoPacking, idPacking: nuevoPacking?.id ?? null } : prev));
  };

  const mensajeError = (err) => err.response?.data?.message || err.message;

  // Otras guías del mismo cliente y dirección de entrega listas para embalar juntas
  const cargarCandidatasPacking = async (docNum = deliveryData?.docNumEntrega) => {
    if (!docNum) return;
    try {
      const res = await axiosInstance.get(`/warehouseModule/packings/candidatas/${docNum}`);
      setCandidatasPacking(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setCandidatasPacking([]);
    }
  };

  // Devuelve el packing de la guía; si aún no tiene, lo crea
  const asegurarPacking = async () => {
    if (packing) return packing;
    const res = await axiosInstance.post('/warehouseModule/packings', { docNums: [deliveryData.docNumEntrega] });
    return res.data.data;
  };

  const handleAgregarGuiaPacking = async (valor) => {
    const docNum = Number(String(valor ?? '').trim().replace(/^0+/, ''));
    if (!docNum) {
      toast({ title: 'Ingresa o escanea el N° de guía a agregar', status: 'warning', duration: 3000 });
      return false;
    }
    if (guiasEmbalaje.some((g) => g.docNumEntrega === docNum)) {
      toast({ title: `La guía ${docNum} ya está en este packing`, status: 'info', duration: 2500 });
      return false;
    }
    setAgregandoGuia(true);
    try {
      const res = packing
        ? await axiosInstance.post(`/warehouseModule/packings/${packing.id}/guias`, { docNum })
        : await axiosInstance.post('/warehouseModule/packings', { docNums: [deliveryData.docNumEntrega, docNum] });
      aplicarPacking(res.data.data);
      cargarCandidatasPacking();
      toast({
        title: `📦 Guía ${docNum} agregada al packing`,
        description: 'Sus productos ya aparecen para embalar. Confirma de nuevo el embalaje.',
        status: 'success',
        duration: 3500,
        isClosable: true,
      });
      return true;
    } catch (err) {
      toast({ title: 'No se pudo agregar la guía', description: mensajeError(err), status: 'error', duration: 5000, isClosable: true });
      return false;
    } finally {
      setAgregandoGuia(false);
    }
  };

  const handleQuitarGuiaPacking = async (docNum) => {
    if (!packing) return;
    setAgregandoGuia(true);
    try {
      const res = await axiosInstance.delete(`/warehouseModule/packings/${packing.id}/guias/${docNum}`);
      aplicarPacking(res.data.data);
      // Sus productos salen de las cajas
      setCajas((prev) => prev.map((c) => ({ ...c, items: c.items.filter((it) => it.docNumEntrega !== docNum) })));
      cargarCandidatasPacking();
      toast({ title: `Guía ${docNum} quitada del packing`, status: 'info', duration: 2500 });
    } catch (err) {
      toast({ title: 'No se pudo quitar la guía', description: mensajeError(err), status: 'error', duration: 4000 });
    } finally {
      setAgregandoGuia(false);
    }
  };

  const handleValidarEmbalaje = async () => {
    if (!deliveryData?.docNumEntrega) return;

    if (!cajas || cajas.length === 0) {
      toast({
        title: 'Cajas requeridas',
        description: 'Debes tener al menos 1 caja o bulto registrado para el embalaje.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (!responsablePacking || responsablePacking.trim().length === 0) {
      toast({
        title: 'Responsable de embalaje requerido',
        description: 'Por favor indica el nombre de la persona que realizó el embalaje.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setGuardandoEmbalaje(true);
    try {
      const p = await asegurarPacking();
      aplicarPacking(p);
      const payload = {
        bultos: cajas.map((c) => ({
          pesoKg: c.pesoKg || null,
          items: c.items.map((it) => ({ idDetalle: it.idDetalle, cantidad: Number(it.cantidad) })),
        })),
        pesoTotalKg: pesoKg ? Number(pesoKg) : null,
        responsablePacking: responsablePacking.trim(),
        observacion: observacionEmbalaje.trim(),
      };

      const res = await axiosInstance.put(`/warehouseModule/packings/${p.id}/embalaje`, payload);

      if (res.data?.success && res.data?.data) {
        aplicarPacking(res.data.data);
        setCajas(cajasDesdePacking(res.data.data));
        toast({
          title: '📦 ¡Embalaje Registrado con Éxito!',
          description: `Guías: ${res.data.data.guias.length} | Bultos: ${cajas.length} | Peso: ${pesoKg || '0'} Kg. Pasa al Control de Despacho (Paso 3).`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
        setTabIndex(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      toast({
        title: 'Error al registrar embalaje',
        description: mensajeError(err),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setGuardandoEmbalaje(false);
    }
  };

  const handleRegistrarDespacho = async () => {
    if (!deliveryData?.docNumEntrega || !packing) return;

    if (!vehiculoPlaca.trim() || !choferNombre.trim()) {
      toast({
        title: 'Datos de Transporte Incompletos',
        description: 'Debes ingresar la Placa del Vehículo y el Nombre del Chofer para despachar.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setGuardandoDespacho(true);
    try {
      const payload = {
        codigoFactura: codigoFactura.trim() || null,
        codigoPedido: codigoPedidoDespacho.trim() || null,
        vehiculoPlaca: vehiculoPlaca.trim().toUpperCase(),
        choferNombre: choferNombre.trim(),
        choferLicencia: choferLicencia.trim(),
        bultosCargados: Number(cajas.length) || Number(bultos) || 1,
        responsableCarga: 'SUPERVISOR RAMPA',
        observacion: observacionDespacho.trim(),
      };

      const res = await axiosInstance.post(`/warehouseModule/packings/${packing.id}/despachar`, payload);

      if (res.data?.success) {
        const refreshed = await axiosInstance.get(`/warehouseModule/guias-salida/sap/${deliveryData.docNumEntrega}`);
        if (refreshed.data?.data) {
          sincronizarDatosFormulario(refreshed.data.data);
        }
        toast({
          title: '🚛 ¡Camión Despachado con Éxito!',
          description: `Control de despacho completado: ${guiasEmbalaje.length} guía(s) en tránsito.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Error al despachar camión',
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setGuardandoDespacho(false);
    }
  };

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'PENDIENTE_PICKING':
        return <Badge colorScheme="yellow" fontSize="0.9em" px={3} py={1} borderRadius="lg">PENDIENTE ALMACÉN</Badge>;
      case 'OBSERVADA':
        return <Badge colorScheme="orange" fontSize="0.9em" px={3} py={1} borderRadius="lg">OBSERVADA (FALTANTES)</Badge>;
      case 'VALIDADA':
        return <Badge colorScheme="teal" fontSize="0.9em" px={3} py={1} borderRadius="lg">VISTO BUENO ALMACÉN</Badge>;
      case 'DESPACHADA':
        return <Badge colorScheme="green" fontSize="0.9em" px={3} py={1} borderRadius="lg">DESPACHADO EN CAMIÓN</Badge>;
      default:
        return <Badge colorScheme="gray" fontSize="0.9em" px={3} py={1} borderRadius="lg">{estado || 'EN REVISIÓN'}</Badge>;
    }
  };

  const tieneVistoBuenoPicking = deliveryData && ['VALIDADA', 'OBSERVADA', 'DESPACHADA'].includes(deliveryData.estado);
  const tieneVistoBuenoEmbalaje =
    tieneVistoBuenoPicking && (['CERRADO', 'DESPACHADO'].includes(packing?.estado) || deliveryData.estado === 'DESPACHADA');
  const tieneVistoBuenoDespacho = deliveryData && (deliveryData.estado === 'DESPACHADA' || packing?.estado === 'DESPACHADO');

  const pasoMaximo = tieneVistoBuenoEmbalaje ? 2 : tieneVistoBuenoPicking ? 1 : 0;

  // Si el paso actual deja de estar habilitado (p. ej. se agregó una guía y el packing se reabrió), retroceder
  useEffect(() => {
    if (tabIndex > pasoMaximo) setTabIndex(pasoMaximo);
  }, [tabIndex, pasoMaximo]);

  // Al entrar al Paso 2, sugerir otras guías del mismo cliente y dirección para embalar juntas
  useEffect(() => {
    if (tabIndex === 1 && tieneVistoBuenoPicking && packing?.estado !== 'DESPACHADO') {
      cargarCandidatasPacking();
    }
  }, [tabIndex, deliveryData?.docNumEntrega, tieneVistoBuenoPicking]);

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="100px">
      <TopHeaderBanner
        title="Flujo Operativo de Almacén & Despacho"
        subtitle={`Paso 1: Guía de Salida (Picking) • Paso 2: Embalaje (Packing & Cajas) • Paso 3: Control de Despacho (Camión) • ${todayStr.charAt(0).toUpperCase() + todayStr.slice(1)}`}
        showBack={true}
        backTo="/dashboard"
        showExchangeRate={false}
        mb={6}
      >
        <Box
          bg="rgba(255,255,255,0.14)"
          border="1px solid rgba(255,255,255,0.25)"
          borderRadius="2xl"
          p={{ base: 3, md: 4 }}
          backdropFilter="blur(10px)"
          boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.2)"
        >
          <form onSubmit={handleBuscar}>
            <Flex gap={3} flexWrap="wrap" align="center">
              <InputGroup size="lg" flex="1" minW="260px">
                <Input
                  ref={inputBusquedaRef}
                  placeholder="Escanea código de barras o escribe N° de Entrega (ej: 000021535)..."
                  defaultValue=""
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.target.select()}
                  size="lg"
                  borderRadius="xl"
                  bg="white"
                  color="gray.800"
                  _placeholder={{ color: 'gray.400' }}
                  boxShadow="sm"
                  autoFocus
                />
                {hasInput && (
                  <InputRightElement h="full" pr={2}>
                    <IconButton
                      size="sm"
                      icon={<CloseIcon />}
                      aria-label="Limpiar búsqueda"
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'red.500', bg: 'gray.100' }}
                      borderRadius="full"
                      onClick={handleLimpiarBusqueda}
                    />
                  </InputRightElement>
                )}
              </InputGroup>
              <Button
                leftIcon={<SearchIcon />}
                colorScheme="green"
                bg="#126C36"
                _hover={{ bg: "#0e572b" }}
                color="white"
                size="lg"
                px={8}
                borderRadius="xl"
                type="submit"
                isLoading={loading}
                loadingText="Buscando..."
                boxShadow="md"
              >
                Buscar Entrega
              </Button>
              {(hasInput || deliveryData) && (
                <Button
                  leftIcon={<CloseIcon />}
                  variant="outline"
                  bg="whiteAlpha.200"
                  _hover={{ bg: "whiteAlpha.300", color: "white" }}
                  color="white"
                  borderColor="whiteAlpha.400"
                  size="lg"
                  px={6}
                  borderRadius="xl"
                  onClick={handleLimpiarBusqueda}
                >
                  Borrar Búsqueda
                </Button>
              )}
            </Flex>
          </form>
        </Box>
      </TopHeaderBanner>

      <Box p={{ base: 3, md: 6 }} maxW="1280px" mx="auto">
        {deliveryData && (
          <VStack spacing={6} align="stretch">
            {/* Cabecera de la Entrega */}
            <GuiaDeliveryHeader
              deliveryData={deliveryData}
              getBadgeEstado={getBadgeEstado}
            />

            {/* Stepper / Tabs */}
            {/* isLazy: solo se renderiza el paso visible (antes se renderizaban los 3 paneles en cada cambio de estado) */}
            <Tabs
              isLazy
              variant="soft-rounded"
              colorScheme="green"
              index={Math.min(tabIndex, pasoMaximo)}
              onChange={(idx) => {
                if (idx > pasoMaximo) return; // No se salta pasos
                setTabIndex(idx);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <TabList bg="white" p={2} borderRadius="2xl" boxShadow="sm" gap={2} flexWrap="wrap">
                <Tab
                  borderRadius="xl"
                  fontWeight="bold"
                  fontSize="sm"
                  _selected={{ bg: '#126C36', color: 'white' }}
                >
                  <HStack spacing={2}>
                    <Icon as={MdAssignment} />
                    <Text>Paso 1: Guía de Salida (Picking)</Text>
                    {tieneVistoBuenoPicking && <Icon as={CheckCircleIcon} color="green.300" />}
                  </HStack>
                </Tab>

                <Tab
                  borderRadius="xl"
                  fontWeight="bold"
                  fontSize="sm"
                  _selected={{ bg: '#126C36', color: 'white' }}
                  isDisabled={!tieneVistoBuenoPicking}
                  title={!tieneVistoBuenoPicking ? 'Primero da el visto bueno de Picking (Paso 1)' : undefined}
                  _disabled={{ opacity: 0.45, cursor: 'not-allowed' }}
                >
                  <HStack spacing={2}>
                    <Icon as={tieneVistoBuenoPicking ? MdInventory : MdLock} />
                    <Text>Paso 2: Embalaje (Packing & Cajas)</Text>
                    {tieneVistoBuenoEmbalaje && <Icon as={CheckCircleIcon} color="green.300" />}
                  </HStack>
                </Tab>

                <Tab
                  borderRadius="xl"
                  fontWeight="bold"
                  fontSize="sm"
                  _selected={{ bg: '#126C36', color: 'white' }}
                  isDisabled={!tieneVistoBuenoEmbalaje}
                  title={!tieneVistoBuenoEmbalaje ? 'Primero confirma el Embalaje (Paso 2)' : undefined}
                  _disabled={{ opacity: 0.45, cursor: 'not-allowed' }}
                >
                  <HStack spacing={2}>
                    <Icon as={tieneVistoBuenoEmbalaje ? MdLocalShipping : MdLock} />
                    <Text>Paso 3: Control de Despacho (Camión)</Text>
                    {tieneVistoBuenoDespacho && <Icon as={CheckCircleIcon} color="green.300" />}
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels mt={4}>
                {/* Paso 1: Picking */}
                <TabPanel p={0}>
                  <Paso1PickingPanel
                    deliveryData={deliveryData}
                    lineas={lineas}
                    handleCambioCantidadSalida={handleCambioCantidadSalida}
                    responsablePicking={responsablePicking}
                    setResponsablePicking={setResponsablePicking}
                    observacionAlmacen={observacionAlmacen}
                    setObservacionAlmacen={setObservacionAlmacen}
                    guardandoPicking={guardandoPicking}
                    handleValidarPicking={handleValidarPicking}
                    tieneVistoBuenoPicking={tieneVistoBuenoPicking}
                    setTabIndex={setTabIndex}
                    getBadgeEstado={getBadgeEstado}
                  />
                </TabPanel>

                {/* Paso 2: Embalaje & Cajas Dinámicas */}
                <TabPanel p={0}>
                  <Paso2EmbalajePanel
                    deliveryData={deliveryData}
                    lineas={lineasEmbalaje}
                    packing={packing}
                    guiasEmbalaje={guiasEmbalaje}
                    candidatasPacking={candidatasPacking}
                    agregandoGuia={agregandoGuia}
                    handleAgregarGuiaPacking={handleAgregarGuiaPacking}
                    handleQuitarGuiaPacking={handleQuitarGuiaPacking}
                    cajas={cajas}
                    getCantidadEmpacada={getCantidadEmpacada}
                    getCantidadPendiente={getCantidadPendiente}
                    handleAbrirModalEmpaque={handleAbrirModalEmpaque}
                    handleCrearNuevaCaja={handleCrearNuevaCaja}
                    handleEliminarCaja={handleEliminarCaja}
                    handleRemoverItemDeCaja={handleRemoverItemDeCaja}
                    handleCambioPesoCaja={handleCambioPesoCaja}
                    pesoKg={pesoKg}
                    setPesoKg={setPesoKg}
                    responsablePacking={responsablePacking}
                    setResponsablePacking={setResponsablePacking}
                    observacionEmbalaje={observacionEmbalaje}
                    setObservacionEmbalaje={setObservacionEmbalaje}
                    guardandoEmbalaje={guardandoEmbalaje}
                    handleValidarEmbalaje={handleValidarEmbalaje}
                    handleEmpacarTodoEnUnSoloBulto={handleEmpacarTodoEnUnSoloBulto}
                    tieneVistoBuenoPicking={tieneVistoBuenoPicking}
                    tieneVistoBuenoEmbalaje={tieneVistoBuenoEmbalaje}
                    setTabIndex={setTabIndex}
                  />
                </TabPanel>

                {/* Paso 3: Control de Despacho (Hoja Rosada & Camión) */}
                <TabPanel p={0}>
                  <Paso3DespachoPanel
                    deliveryData={deliveryData}
                    guiasEmbalaje={guiasEmbalaje}
                    cajas={cajas}
                    bultos={bultos}
                    pesoKg={pesoKg}
                    responsablePacking={responsablePacking}
                    vehiculoPlaca={vehiculoPlaca}
                    setVehiculoPlaca={setVehiculoPlaca}
                    choferNombre={choferNombre}
                    setChoferNombre={setChoferNombre}
                    choferLicencia={choferLicencia}
                    setChoferLicencia={setChoferLicencia}
                    codigoFactura={codigoFactura}
                    setCodigoFactura={setCodigoFactura}
                    codigoPedidoDespacho={codigoPedidoDespacho}
                    setCodigoPedidoDespacho={setCodigoPedidoDespacho}
                    observacionDespacho={observacionDespacho}
                    setObservacionDespacho={setObservacionDespacho}
                    guardandoDespacho={guardandoDespacho}
                    handleRegistrarDespacho={handleRegistrarDespacho}
                    tieneVistoBuenoEmbalaje={tieneVistoBuenoEmbalaje}
                    setTabIndex={setTabIndex}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        )}

        {/* Modal de Empaque Dinámico */}
        <ModalEmpaque
          isOpen={modalEmpaqueOpen}
          onClose={() => setModalEmpaqueOpen(false)}
          articulo={articuloSeleccionadoEmpaque}
          cajas={cajas}
          cajaDestinoSeleccionada={cajaDestinoSeleccionada}
          setCajaDestinoSeleccionada={setCajaDestinoSeleccionada}
          cantidadEmpacarInput={cantidadEmpacarInput}
          setCantidadEmpacarInput={setCantidadEmpacarInput}
          getCantidadEmpacada={getCantidadEmpacada}
          getCantidadPendiente={getCantidadPendiente}
          handleConfirmarEmpaque={handleConfirmarEmpaque}
        />
      </Box>
    </Box>
  );
}
