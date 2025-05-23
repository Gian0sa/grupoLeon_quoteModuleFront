import { axiosInstance } from "../../../shared/lib/axiosInstance";

export async function unifiedClientData(id) {
    
  const getDetailsClient = async (id) => {
    const { data } = await axiosInstance.get(`/getQuoteDraft/${id}`);
    const { client, products } = splitQuoteDraft(data);
    
    return { client, products };
  };

  const { client, products } = await getDetailsClient(id);

  const clientcode= client.document
  console.log("clientcode",clientcode);

  const getDeliveryPoints = async (clientcode) => {
    const { data } = await axiosInstance.get(`/clients/${clientcode}/delivery-point`);
    return data;
  };

  const getTransports = async () => {
    const { data } = await axiosInstance.get(`/transports/clients`);
    return data;
  };

  function splitQuoteDraft(quoteDraft) {
    const client = {
      id: quoteDraft.id,
      name: quoteDraft.clientName,
      document: quoteDraft.clientDocument,
      address: quoteDraft.clientAddress,
      deliveryPoint: quoteDraft.deliveryPoint,
      transport: quoteDraft.transport,
      transportDirection: quoteDraft.transportDirection,
      paymentMethod: quoteDraft.paymentMethod,
      abonado: quoteDraft.abonado,
      bankName: quoteDraft.bankName,
      checkNumber: quoteDraft.checkNumber,
    };
    const products = quoteDraft.items.map((item) => ({
      id:         item.id,
      code:       item.productCode,
      name:       item.productName,
      unitPrice:  item.unitPrice,
      quantity:   item.quantity,
      totalPrice: item.totalPrice,
    }));
    return { client, products };
  }

  const [deliveryPoints, transports] = await Promise.all([
    getDeliveryPoints(client.id),
    getTransports(client.id),
  ]);

  return { clientHistory, productsHistory, deliveryPointsHistory, transportsHistory };
}
