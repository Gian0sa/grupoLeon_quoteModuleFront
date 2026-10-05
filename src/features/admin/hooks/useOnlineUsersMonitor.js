import { useState, useEffect, useMemo, useRef } from "react";
import { socket } from "../../../shared/lib/socket";
import { getPresenceUsers } from "../services/presenceService";
import { useGetAllUsersAdmin } from "./queries/authAdminQueries";

/**
 * Hook para la pantalla de Monitor de Usuarios en Línea
 * Combina la lista oficial de usuarios de BD con la presencia en tiempo real de WebSockets.
 */
export function useOnlineUsersMonitor() {
  const { data: registeredUsers = [], isLoading: isLoadingUsers } = useGetAllUsersAdmin();
  const [presenceMap, setPresenceMap] = useState({});
  const [isLoadingPresence, setIsLoadingPresence] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Timer local para refrescar tiempos relativos y expiraciones sin consultar al servidor
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Carga inicial y suscripción a WebSockets
  useEffect(() => {
    let isMounted = true;

    // 1. Carga REST inicial
    getPresenceUsers()
      .then((list) => {
        if (!isMounted) return;
        const initialMap = {};
        if (Array.isArray(list)) {
          list.forEach((u) => {
            initialMap[u.userId] = u;
          });
        }
        setPresenceMap(initialMap);
        setIsLoadingPresence(false);
      })
      .catch((err) => {
        console.warn("⚠️ No se pudo obtener presencia inicial vía REST:", err.message);
        if (isMounted) setIsLoadingPresence(false);
      });

    const getAdminPayload = () => {
      try {
        const rawId = localStorage.getItem("userId");
        return {
          userId: rawId ? Number(rawId) : null,
          username: localStorage.getItem("username") || null,
          permissions: JSON.parse(localStorage.getItem("endpoints") || "[]"),
          salesEmployeeCode: localStorage.getItem("salesEmployeeCode") || null,
        };
      } catch {
        return {};
      }
    };

    // 2. Suscribirse a la sala de monitor en el WebSocket
    const onConnect = () => {
      socket.emit("presence:subscribe", { user: getAdminPayload() });
    };

    if (socket.connected) {
      socket.emit("presence:subscribe", { user: getAdminPayload() });
    } else {
      socket.connect();
      socket.once("connect", onConnect);
    }

    // 3. Escuchar snapshot completo
    const handlePresenceList = (list) => {
      if (!isMounted || !Array.isArray(list)) return;
      const map = {};
      list.forEach((u) => {
        map[u.userId] = u;
      });
      setPresenceMap(map);
      setIsLoadingPresence(false);
    };

    // 4. Escuchar actualización atómica de un usuario
    const handlePresenceUpdate = (user) => {
      if (!isMounted || !user || !user.userId) return;
      setPresenceMap((prev) => ({
        ...prev,
        [user.userId]: user,
      }));
    };

    socket.on("presence:list", handlePresenceList);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      isMounted = false;
      socket.emit("presence:unsubscribe");
      socket.off("presence:list", handlePresenceList);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("connect", onConnect);
    };
  }, []);

  // 5. Unificar usuarios registrados con su presencia en tiempo real
  const users = useMemo(() => {
    const allUsersList = Array.isArray(registeredUsers) ? registeredUsers : [];
    const resultMap = new Map();

    // Agregar todos los usuarios registrados
    allUsersList.forEach((regUser) => {
      const presence = presenceMap[regUser.id];
      const hasPresence = !!presence;

      // Calcular estado dinámico con el timestamp actual
      let status = "OFFLINE";
      if (hasPresence && presence.status) {
        if (presence.status === "ONLINE" || presence.status === "IDLE") {
          status = presence.status;
        } else {
          status = "OFFLINE";
        }
      }

      resultMap.set(regUser.id, {
        userId: regUser.id,
        name: regUser.username || `Usuario #${regUser.id}`,
        username: regUser.username,
        email: regUser.email,
        salesEmployeeCode: regUser.salesEmployeeCode,
        role: regUser.salesEmployeeCode ? "Asesor de Ventas" : "Administrador / Oficina",
        active: regUser.active !== false,
        status,
        currentPage: hasPresence ? presence.currentPage : "-",
        lastPage: hasPresence ? presence.lastPage : "-",
        pageHistory: hasPresence && Array.isArray(presence.pageHistory) ? presence.pageHistory : [],
        connectedAt: hasPresence && status !== "OFFLINE" ? presence.connectedAt : null,
        lastActivity: hasPresence ? presence.lastActivity : null,
        device: hasPresence ? presence.device : { type: "Desktop", browser: "-", os: "-" },
        activeTabs: hasPresence ? presence.activeTabs : 0,
      });
    });

    // Agregar usuarios que estén en presenceMap pero no estén en la lista de registrados
    Object.values(presenceMap).forEach((presUser) => {
      if (!resultMap.has(presUser.userId)) {
        resultMap.set(presUser.userId, {
          userId: presUser.userId,
          name: presUser.name || presUser.username || `Usuario #${presUser.userId}`,
          username: presUser.username,
          email: "-",
          salesEmployeeCode: presUser.salesEmployeeCode,
          role: presUser.role || "Usuario",
          active: true,
          status: presUser.status || "ONLINE",
          currentPage: presUser.currentPage || "-",
          lastPage: presUser.lastPage || "-",
          pageHistory: Array.isArray(presUser.pageHistory) ? presUser.pageHistory : [],
          connectedAt: presUser.connectedAt,
          lastActivity: presUser.lastActivity,
          device: presUser.device || { type: "Desktop", browser: "-", os: "-" },
          activeTabs: presUser.activeTabs || 1,
        });
      }
    });

    return Array.from(resultMap.values());
  }, [registeredUsers, presenceMap, now]);

  // Contadores para las 4 tarjetas superiores
  const counts = useMemo(() => {
    let online = 0;
    let idle = 0;
    let offline = 0;

    users.forEach((u) => {
      if (u.status === "ONLINE") online++;
      else if (u.status === "IDLE") idle++;
      else offline++;
    });

    return {
      online,
      idle,
      offline,
      total: users.length,
    };
  }, [users]);

  return {
    users,
    counts,
    isLoading: isLoadingUsers || isLoadingPresence,
  };
}
