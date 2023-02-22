import { afterAll, beforeAll, expect, it, describe, beforeEach } from 'vitest';
import request from 'supertest';
import { execSync } from 'node:child_process';
import { app } from '../src/app';

const createTransactionSut = async () => {
  return await request(app.server).post('/transactions').send({
    title: 'New transaction',
    amount: 5000,
    type: 'credit',
  });
};

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    execSync('npm run knex migrate:rollback --all');
    execSync('npm run knex migrate:latest');
  });

  it('should be able to create a new transaction', async () => {
    const response = await createTransactionSut();

    expect(response.statusCode).toEqual(201);
  });

  it('should be able to list all transactions', async () => {
    const createTransactionResponse = await createTransactionSut();

    const cookies = createTransactionResponse.get('Set-Cookie');

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies);

    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    ]);
  });

  it('should be able to get a specific transaction', async () => {
    const createTransactionResponse = await createTransactionSut();

    const cookies = createTransactionResponse.get('Set-Cookie');

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies);

    const { id } = listTransactionsResponse.body.transactions[0];

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${id}`)
      .set('Cookie', cookies);

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        id,
      })
    );
  });

  it('should be able get transactions summary', async () => {
    const createTransactionResponse = await createTransactionSut();

    const cookies = createTransactionResponse.get('Set-Cookie');

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        title: 'New transaction2',
        amount: 3000,
        type: 'debit',
      });

    const getTransactionsSummaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies);

    expect(getTransactionsSummaryResponse.body.summary).toEqual({
      amount: 2000,
    });
  });
});
