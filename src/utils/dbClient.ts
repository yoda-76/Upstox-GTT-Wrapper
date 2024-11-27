import { prisma } from '../lib/db';
import { ChildAccount, MasterAccount, User } from '@prisma/client';

class DBClient {

  //user
  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(data: { name: string, email: string, password: string, ph_number:string, role: "USER" | "ADMIN" }) {
    return prisma.user.create({
      data,
    });
    //create prefrences record
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async createUserPrefrences(id: string) {
    return prisma.prefrences.create({
      data: {
        user_id: id,
      },
    });
  }

  async updateUserPrefrencesById(id: string, data: User) {
    return prisma.prefrences.update({
      where: { user_id: id },
      data,
    });
  }

  async getUserPrefrencesById(id: string) {
    return prisma.prefrences.findUnique({
      where: { user_id: id },
    });
  }

  // master account
  async createMasterAccount(
    user_id: string,
    key: string,
    secret: string,
    broker: "UPSTOCKS" | "DHAN" | "ANGEL" | "ESPRESSO",
    broker_id: string,
    u_id:string) {
    try {
      const masterAccount=await prisma.masterAccount.create({
        data: {
          user_id,
          key,
          secret,
          broker,
          broker_id,
          u_id
        },
      });
      return masterAccount;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteMasterAccount(id: string) {
    return prisma.masterAccount.delete({
      where: { id },
    });
  }

  async deleteMasterAccountByUid(u_id: string) {
    return prisma.masterAccount.delete({
      where: { u_id },
    });
  }

  async updateMasterAccountByUid(u_id: string, data: MasterAccount) {
    return prisma.masterAccount.update({
      where: { u_id },
      data,
    });
  }

  async updateMasterAccessTokenByUid(u_id: string, data: {access_token: string, last_token_generated_at: Date}) {
    return prisma.masterAccount.update({
      where: { u_id },
      data,
    });
  }
  async updateMasterAccountById(id: string, data: MasterAccount) {
    return prisma.masterAccount.update({
      where: { id },
      data,
    });
  }

  async getMasterAccountByUid(u_id: string) {
    return prisma.masterAccount.findUnique({
      where: { u_id },
    });
  }

  async getMasterAccountById(id: string) {
    return prisma.masterAccount.findUnique({
      where: { id },
    });
  }

  async getMasterAccounts() {
    return prisma.masterAccount.findMany();
  }

  async getMasterAccountsByUserId(user_id: string) {
    return prisma.masterAccount.findMany({
      where: { user_id },
    });
  }

  async getMasterAccountByBrokerId(broker_id: string) {
    return prisma.masterAccount.findUnique({
      where: { broker_id },
    })
  }


  // child account

  async createChildAccount(
    email: string,
    key: string,
    secret: string,
    broker: "UPSTOCKS" | "DHAN" | "ANGEL" | "ESPRESSO",
    broker_id: string,
    master: string,
    u_id:string) {
    try {
      const masterAccount = await prisma.masterAccount.findUnique({
        where: {
          u_id:master,
        },
      });
      const childAccount = await prisma.childAccount.create({
        data: {
          master_id: masterAccount.id,
          key,
          secret,
          broker,
          broker_id,
          u_id
        },
      });
      return childAccount;
    } catch (error) {
      console.log(error);
    }
  }

  async deleteChildAccount(id: string) {
    return prisma.childAccount.delete({
      where: { id },
    });
  }

  async deleteChildAccountByUid(u_id: string) {
    return prisma.childAccount.delete({
      where: { u_id },
    });
  }


  async updateChildAccountByUid(u_id: string, data: ChildAccount) {
    return prisma.childAccount.update({
      where: { u_id },
      data,
    });
  }

  async toggleChildAccountByUid(u_id: string, data: {active: boolean}) {
    return prisma.childAccount.update({
      where: { u_id },
      data,
    });
  }
  
  async updateChildAccountMultiplierByUid(u_id: string, data: {multiplier: number}) {
    return prisma.childAccount.update({
      where: { u_id },
      data,
    });
  }

  async updateChildAccountById(id: string, data) {
    return prisma.childAccount.update({
      where: { id },
      data,
    });
  }

  async updateChildAccessTokenByUid(u_id: string, data: {access_token: string, last_token_generated_at: Date}) {
    return prisma.childAccount.update({
      where: { u_id },
      data,
    });
  }

  async getChildAccountByUid(u_id: string) {
    return prisma.childAccount.findUnique({
      where: { u_id },
    });
  }

  async getChildAccountById(id: string) {
    return prisma.childAccount.findUnique({
      where: { id },
    });
  }

  async getChildAccountsByMasterId(master_id: string) {
    return prisma.childAccount.findMany({
      where: { master_id: master_id },
    });
  }

  async getChildAccountByBrokerId(broker_id: string) {
    return prisma.childAccount.findUnique({
      where: { broker_id },
    })
  }
  
  async getChildAccounts() {
    return prisma.childAccount.findMany();
  }

  async persistOrderbook(accountId: string, orderId: string, orderDetails: any, childOrders: any): Promise<void> {
    await prisma.orderBook.upsert({
      where:{order_id: orderId},
      create:{
        account_id: accountId,
        order_id: orderId,
        order_details: orderDetails,
        child_orders: childOrders 
      },
      update:{
        order_details: orderDetails,
        child_orders: childOrders
      }
    })
    //save to db
  }
}

export const dbClient = new DBClient();
