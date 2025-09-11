import React, { useState } from "react";
import {
  Box,
  Text,
  Input,
  Textarea,
  Button,
  VStack,
  Skeleton,
  HStack,
  Select,
  useColorModeValue,
  IconButton,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { BackButton } from "../../../components/BackButton";
import {
  useCreateNotification,
  useDeleteNotification,
  useUpdateNotification,
} from "../hooks/mutations/dashboardMutations";
import { useNotifications } from "../hooks/queries/dashboardQueries";
import { useAuthStore } from "../../auth/stores/useAuthStore";

import styles from "./Notification.module.css";

export function NotificationPage() {
  const cardBg = useColorModeValue("white", "gray.800");
  const { username } = useAuthStore();

  const { data: notifications = [], isLoading } = useNotifications();
  const createNotification = useCreateNotification();
  const deleteNotification = useDeleteNotification();
  const updateNotification = useUpdateNotification();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType("info");
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
    updateNotification.mutate(
        {
        id: editingId,
        data: { title, message, type },
        },
        { onSuccess: resetForm }
    );
    } else {
    createNotification.mutate(
        { title, message, type, createdBy: username },
        { onSuccess: resetForm }
    );
    }
  };

  const handleDelete = (id) => {
    deleteNotification.mutate(id);
  };

  const handleEdit = (n) => {
    setTitle(n.title);
    setMessage(n.message);
    setType(n.type);
    setEditingId(n.id);
  };

  return (
    <Box maxW="1000px" fontFamily="'InterVariable', sans-serif" pb="100px">
      {/* Cabecera */}
      <Box size="lg" mb={6} fontWeight="bold" className={styles.heading}>
        <div className={styles.topHeader}>
          <div className={styles.reportTitle}>
            <div>Notificaciones</div>
            <div className={styles.backbtn}>
              <BackButton />
            </div>
          </div>
        </div>
      </Box>

      {/* Formulario crear/editar notificación */}
      <Box px={6}>
        <Box
          bg={cardBg}
          p={6}
          borderRadius="2xl"
          shadow="md"
          maxW="600px"
          mx="auto"
        >
          <VStack as="form" spacing={4} align="stretch" onSubmit={handleSubmit}>
            <Text fontSize="xl" fontWeight="bold">
              {editingId ? "Editar Notificación" : "Crear Notificación"}
            </Text>

            <Box>
              <Text mb={1} fontWeight="medium">
                Título
              </Text>
              <Input
                placeholder="Título de la notificación"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Box>

            <Box>
              <Text mb={1} fontWeight="medium">
                Mensaje
              </Text>
              <Textarea
                placeholder="Escribe el mensaje"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Box>

            <Box>
              <Text mb={1} fontWeight="medium">
                Tipo
              </Text>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="alert">Alert</option>
              </Select>
            </Box>

            <HStack justify="flex-end" pt={2}>
              {editingId && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                colorScheme={editingId ? "green" : "blue"}
                isDisabled={!title || !message}
                isLoading={
                  editingId
                    ? updateNotification.isPending
                    : createNotification.isPending
                }
              >
                {editingId ? "Actualizar" : "Crear"}
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>

      {/* Lista de notificaciones */}
      <Box px={6} mt={8}>
        <Text fontWeight="bold" mb={3}>
          Todas las notificaciones
        </Text>

        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} height="80px" mb={3} borderRadius="md" />
          ))
        ) : notifications.length === 0 ? (
          <Text color="gray.500">No hay notificaciones aún.</Text>
        ) : (
          <VStack align="stretch" spacing={3}>
            {notifications.map((n) => (
              <HStack
                key={n.id}
                bg={cardBg}
                p={4}
                borderRadius="lg"
                shadow="sm"
                justify="space-between"
                align="center"
              >
                <Box>
                  <Text fontWeight="bold">{n.title}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {n.message}
                  </Text>
                  <Text fontSize="xs" mt={1} color="gray.500">
                    Tipo: {n.type}
                  </Text>
                </Box>

                <HStack>
                  <IconButton
                    aria-label="Editar notificación"
                    icon={<EditIcon />}
                    colorScheme="yellow"
                    size="sm"
                    onClick={() => handleEdit(n)}
                  />
                  <IconButton
                    aria-label="Eliminar notificación"
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    size="sm"
                    onClick={() => handleDelete(n.id)}
                    isLoading={deleteNotification.isPending}
                  />
                </HStack>
              </HStack>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}