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

  const [docNumInput, setDocNumInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deliveryData, setDeliveryData] = useState(null);
  const [tabIndex, setTabIndex] = useState(0); // 0: Picking, 1: Embalaje, 2: Despacho
  const toast = useToast();
  const inputBusquedaRef = useRef(null);
  const timerBusquedaRef = useRef(null);
  const lastKeyTimeRef = useRef(0);
  const resetOnNextScanRef = useRef(false);

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

  const getCantidadEmpacada = (codigoArticulo) => {
    return cajas.reduce((total, c) => {
      const match = c.items?.find((it) => it.codigoArticulo === codigoArticulo);
      return total + (match ? Number(match.cantidad || 0) : 0);
    }, 0);
  };

  const getCantidadPendiente = (linea) => {
    const aprobada = Number(linea.cantidadSalida || 0);
    const empacada = getCantidadEmpacada(linea.codigoArticulo);
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
      (it) => it.codigoArticulo === articuloSeleccionadoEmpaque.codigoArticulo
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

  const handleRemoverItemDeCaja = (cajaId, codigoArticulo) => {
    setCajas((prev) =>
      prev.map((c) => {
        if (String(c.id) !== String(cajaId)) return c;
        return {
          ...c,
          items: c.items.filter((it) => it.codigoArticulo !== codigoArticulo),
        };
      })
    );
  };

  const handleEmpacarTodoEnUnSoloBulto = () => {
    const todosLosItems = lineas
      .filter((l) => Number(l.cantidadSalida || 0) > 0)
      .map((l) => ({
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

    // Datos de Almacén & Embalaje
    setBultos(d.bultosTotal || 1);
    setPesoKg(d.pesoTotalKg !== null && d.pesoTotalKg !== undefined ? String(d.pesoTotalKg) : '');
    setResponsablePicking(d.responsablePicking || usuarioSesion);
    setResponsablePacking(d.responsablePacking || '');

    // Deserializar Cajas si existen en observacionAlmacen
    let cajasCargadas = null;
    try {
      if (d.observacionAlmacen && d.observacionAlmacen.trim().startsWith('{')) {
        const parsed = JSON.parse(d.observacionAlmacen);
        if (parsed.cajas && Array.isArray(parsed.cajas) && parsed.cajas.length > 0) {
          cajasCargadas = parsed.cajas.map((c, idx) => ({
            id: c.id || idx + 1,
            bultoNumero: c.bultoNumero || idx + 1,
            codigoCaja: c.codigoCaja || `Bulto ${idx + 1}`,
            pesoKg: c.pesoKg !== undefined && c.pesoKg !== null ? String(c.pesoKg) : '',
            items: c.items || [],
          }));
          setObservacionEmbalaje(parsed.observacionEmbalaje || '');
        }
      }
    } catch {}

    if (cajasCargadas && cajasCargadas.length > 0) {
      setCajas(cajasCargadas);
      setBultos(cajasCargadas.length);
    } else {
      setCajas([{ id: 1, bultoNumero: 1, codigoCaja: 'Bulto 1', pesoKg: d.pesoTotalKg ? String(d.pesoTotalKg) : '', items: [] }]);
      setObservacionEmbalaje(d.observacionAlmacen || '');
    }

    // Datos de Factura y Pedido
    setCodigoFactura(d.despacho?.codigoFactura || d.codigoFactura || '');
    setCodigoPedidoDespacho(d.despacho?.codigoPedido ? String(d.despacho.codigoPedido) : (d.codigoPedido ? String(d.codigoPedido) : ''));

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
    if (d.estado === 'DESPACHADA') {
      setTabIndex(2);
    } else if (d.responsablePacking && Number(d.bultosTotal) > 0) {
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
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
  };

  const ejecutarBusqueda = async (codigoDirecto = null) => {
    const cleanNum = (codigoDirecto !== null && codigoDirecto !== undefined ? String(codigoDirecto) : docNumInput).trim();
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

    setLoading(true);
    try {
      const res = await axiosInstance.get(`/warehouseModule/guias-salida/sap/${cleanNum}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        sincronizarDatosFormulario(d);
        resetOnNextScanRef.current = true;
        setTimeout(() => {
          inputBusquedaRef.current?.select();
        }, 100);

        toast({
          title: res.data.origen === 'BASE_DE_DATOS_LOCAL' ? 'Guía cargada de BD' : 'Entrega consultada en SAP',
          description: `Guía ${d.numeroGuiaInterna} con estado: ${d.estado}`,
          status: 'success',
          duration: 3000,
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
    if (e.key === 'Enter') {
      if (timerBusquedaRef.current) clearTimeout(timerBusquedaRef.current);
      handleBuscar(e);
      return;
    }

    const now = Date.now();
    // Si ya existe una búsqueda cargada y se empieza a pistolear un nuevo código tras una pausa (>600ms),
    // o el flag resetOnNextScanRef está activo, limpiamos el campo para que el nuevo código reemplace directamente
    if (
      (resetOnNextScanRef.current || (docNumInput && now - lastKeyTimeRef.current > 600)) &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      resetOnNextScanRef.current = false;
      setDocNumInput('');
    }
    lastKeyTimeRef.current = now;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    lastKeyTimeRef.current = Date.now();
    setDocNumInput(val);

    if (timerBusquedaRef.current) {
      clearTimeout(timerBusquedaRef.current);
    }

    const clean = val.trim();
    // Cuando el escáner de códigos de barras llena el código completo (mínimo 4 caracteres)
    // dispara la búsqueda automáticamente tras breve pausa de 300ms
    if (clean.length >= 4) {
      timerBusquedaRef.current = setTimeout(() => {
        ejecutarBusqueda(clean);
      }, 300);
    }
  };

  const handleBuscar = (e) => {
    if (e) e.preventDefault();
    if (timerBusquedaRef.current) {
      clearTimeout(timerBusquedaRef.current);
    }
    ejecutarBusqueda(docNumInput);
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
      const payload = {
        bultosTotal: Number(cajas.length) || Number(bultos) || 1,
        pesoTotalKg: pesoKg ? Number(pesoKg) : null,
        responsablePacking: responsablePacking.trim(),
        observacionEmbalaje: observacionEmbalaje.trim(),
        cajas: cajas,
      };

      const res = await axiosInstance.post(
        `/warehouseModule/guias-salida/${deliveryData.docNumEntrega}/validar-embalaje`,
        payload
      );

      if (res.data?.success && res.data?.data) {
        sincronizarDatosFormulario(res.data.data);
        toast({
          title: '📦 ¡Embalaje Registrado con Éxito!',
          description: `Bultos: ${cajas.length} | Peso: ${pesoKg || '0'} Kg. Pasa al Control de Despacho (Paso 3).`,
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
        description: err.response?.data?.message || err.message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setGuardandoEmbalaje(false);
    }
  };

  const handleRegistrarDespacho = async () => {
    if (!deliveryData?.docNumEntrega) return;

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
        codigoPedido: codigoPedidoDespacho.trim() ? Number(codigoPedidoDespacho) : null,
        vehiculoPlaca: vehiculoPlaca.trim().toUpperCase(),
        choferNombre: choferNombre.trim(),
        choferLicencia: choferLicencia.trim(),
        bultosCargados: Number(cajas.length) || Number(bultos) || 1,
        responsableCarga: 'SUPERVISOR RAMPA',
        observacion: observacionDespacho.trim(),
      };

      const res = await axiosInstance.post(
        `/warehouseModule/guias-salida/${deliveryData.docNumEntrega}/despachar-camion`,
        payload
      );

      if (res.data?.success) {
        const refreshed = await axiosInstance.get(`/warehouseModule/guias-salida/sap/${deliveryData.docNumEntrega}`);
        if (refreshed.data?.data) {
          sincronizarDatosFormulario(refreshed.data.data);
        }
        toast({
          title: '🚛 ¡Camión Despachado con Éxito!',
          description: 'Control de despacho completado. Mercadería registrada en tránsito.',
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
  const tieneVistoBuenoEmbalaje = tieneVistoBuenoPicking && (Boolean(deliveryData.responsablePacking) || deliveryData.estado === 'DESPACHADA');
  const tieneVistoBuenoDespacho = deliveryData && deliveryData.estado === 'DESPACHADA';

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
                  value={docNumInput}
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
                {docNumInput && (
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
              {(docNumInput || deliveryData) && (
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
            <Tabs
              variant="soft-rounded"
              colorScheme="green"
              index={tabIndex}
              onChange={(idx) => {
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
                    lineas={lineas}
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
