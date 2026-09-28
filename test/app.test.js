const request = require('supertest');
const app = require('../app');

describe('Node.js CI/CD Demo', () => {
    test('GET / should return the application message', async () => {
        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Node.js CI/CD Demo is running!');
    });

    test('GET /health should return UP', async () => {
        const response = await request(app).get('/health');

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('UP');
    });
});
