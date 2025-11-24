import { FormControl, FormLabel, FormErrorMessage, Input, Switch } from "@chakra-ui/react";


export default function UserBasicFields({ formData, errors, onChange }) {
  return (
    <>
      <FormControl isInvalid={errors.username} isRequired>
        <FormLabel fontWeight="semibold">Usuario</FormLabel>
        <Input
          name="username"
          value={formData.username}
          onChange={onChange}
          focusBorderColor="green.500"
        />
        <FormErrorMessage>{errors.username}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={errors.email} isRequired>
        <FormLabel fontWeight="semibold">Email</FormLabel>
        <Input
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          focusBorderColor="green.500"
        />
        <FormErrorMessage>{errors.email}</FormErrorMessage>
      </FormControl>

      <FormControl>
        <FormLabel fontWeight="semibold">Código de Vendedor</FormLabel>
        <Input
          name="salesEmployeeCode"
          value={formData.salesEmployeeCode || ""}
          onChange={onChange}
          focusBorderColor="green.500"
          placeholder="Opcional"
        />
      </FormControl>

      <FormControl>
        <FormLabel fontWeight="semibold">Nueva contraseña</FormLabel>
        <Input
          name="newPassword"
          type="password"
          value={formData.newPassword}
          onChange={onChange}
          focusBorderColor="green.500"
          placeholder="Dejar vacío para mantener la actual"
        />
      </FormControl>

      <FormControl display="flex" alignItems="center" justifyContent="space-between">
        <FormLabel mb="0" fontWeight="semibold">Usuario activo</FormLabel>
        <Switch 
          isChecked={formData.active}
          onChange={(e) =>
            onChange({ target: { name: 'active', value: e.target.checked } })
          }
          colorScheme="green"
          size="lg"
        />
      </FormControl>
    </>
  );
}