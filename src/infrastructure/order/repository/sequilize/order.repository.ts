
import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import OrderRepositoryInterface from "../../../../domain/checkout/repository/order-repository.interface";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";

export default class OrderRepository implements OrderRepositoryInterface{

  async create(entity: Order): Promise<void> {
    await OrderModel.create(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
        items: entity.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    );
  }
  async update(entity: Order): Promise<void> {
    const transaction = await OrderModel.sequelize.transaction();
    try {
      await OrderItemModel.destroy({
        where: { order_id: entity.id }, transaction
      });
      await OrderModel.update(
        {
          customer_id: entity.customerId,
          total: entity.total()
        },
        { where: { id: entity.id }, transaction }
      );
      await OrderItemModel.bulkCreate(
        entity.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
          order_id: entity.id
        })), { transaction });
      transaction.commit();
    } catch (error) {
      await transaction.rollback();
    }
  }

  async find(id: string): Promise<Order> {
    let orderModel;
    try {
      orderModel = await OrderModel.findOne({
        where: {
          id,
        },
        include: [{ model: OrderItemModel }],
        rejectOnEmpty: true,
      });
    } catch (error) {
      throw new Error("Order not found");
    }
    const items = orderModel.items.map(orderItemModel => new OrderItem(
      orderItemModel.id,
      orderItemModel.name,
      orderItemModel.price,
      orderItemModel.product_id,
      orderItemModel.quantity
    ));

    return new Order(orderModel.id, orderModel.customer_id, items);
  }

  async findAll(): Promise<Order[]> {
    const orderModels = await OrderModel.findAll({ include: [{ model: OrderItemModel }] });
    const orders = orderModels.map((orderModels) => {
      let order = new Order(orderModels.id, orderModels.customer_id,
        orderModels.items.map((itens) => {
          let item = new OrderItem(
            itens.id,
            itens.name,
            itens.price,
            itens.product_id,
            itens.quantity);
          return item;
        }))
      return order;
    });

    return orders;
  }
}
