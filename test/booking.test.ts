import axios, { AxiosError } from 'axios';
import { startServer, stopServer } from '../source/server';
import { PrismaClient } from '@prisma/client';

const GUEST_A_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_A_UNIT_2 = {
    unitID: '2',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_B_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestB',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const prisma = new PrismaClient();

beforeEach(async () => {
    // Clear any test setup or state before each test
    await prisma.booking.deleteMany();
});

beforeAll(async () => {
    await startServer();
});

afterAll(async () => {
    await prisma.$disconnect();
    await stopServer();
});

describe('Booking API', () => {

    test('Create fresh booking', async () => {
        const response = await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);

        expect(response.status).toBe(200);
        expect(response.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response.data.unitID).toBe(GUEST_A_UNIT_1.unitID);
        expect(response.data.numberOfNights).toBe(GUEST_A_UNIT_1.numberOfNights);
    });

    test('Same guest same unit booking', async () => {
        // Create first booking
        const response1 = await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
        expect(response1.status).toBe(200);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // Guests want to book the same unit again
        let error: any;
        try {
            await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(400);
        expect(error.response.data).toEqual('The given guest name cannot book the same unit multiple times');
    });

    test('Same guest different unit booking', async () => {
        // Create first booking
        const response1 = await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
        expect(response1.status).toBe(200);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // Guest wants to book another unit
        let error: any;
        try {
            await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_2);
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(400);
        expect(error.response.data).toEqual('The same guest cannot be in multiple units at the same time');
    });

    test('Different guest same unit booking', async () => {
        // Create first booking
        const response1 = await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
        expect(response1.status).toBe(200);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // GuestB trying to book a unit that is already occupied
        let error: any;
        try {
            await axios.post('http://localhost:8000/api/v1/booking', GUEST_B_UNIT_1);
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(400);
        expect(error.response.data).toEqual('For the given check-in date, the unit is already occupied');
    });

    test('Different guest same unit booking different date', async () => {
        // Create first booking
        const response1 = await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
        expect(response1.status).toBe(200);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);

        // GuestB trying to book a unit that is already occupied
        // Now we need to check the error state, not normal response state
        let error: any;
        try {
            await axios.post('http://localhost:8000/api/v1/booking', {
                unitID: '1',
                guestName: 'GuestB',
                checkInDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                numberOfNights: 5
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(400);
        expect(error.response.data).toEqual('For the given check-in date, the unit is already occupied');
    });
    test('Guest updates the booking', async () => {
        // First create a booking
        const createResponse = await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
        expect(createResponse.status).toBe(200);
        expect(createResponse.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(createResponse.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // Now update the number of nights
        const updateResponse = await axios.patch('http://localhost:8000/api/v1/booking', {
            guestName: GUEST_A_UNIT_1.guestName,
            unitID: GUEST_A_UNIT_1.unitID,
            checkInDate: GUEST_A_UNIT_1.checkInDate,
            numberOfNights: 10
        });
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.numberOfNights).toBe(10);

        // Now update the check-in date
        const newCheckInDate = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const updateResponse2 = await axios.patch('http://localhost:8000/api/v1/booking', {
            guestName: GUEST_A_UNIT_1.guestName,
            unitID: GUEST_A_UNIT_1.unitID,
            checkInDate: newCheckInDate,
            numberOfNights: 10
        });
        expect(updateResponse2.status).toBe(200);
        expect(new Date(updateResponse2.data.checkInDate).toISOString().split('T')[0]).toBe(newCheckInDate);
    })
    test('Guest updates the booking to an unavailable date', async () => {
        // First create a booking
        const createResponse = await axios.post('http://localhost:8000/api/v1/booking', GUEST_A_UNIT_1);
        expect(createResponse.status).toBe(200);
        expect(createResponse.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(createResponse.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // Now create another booking for a different guest on a different date
        const anotherBookingDate = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const createResponse2 = await axios.post('http://localhost:8000/api/v1/booking', {
            unitID: '1',
            guestName: 'GuestB',
            checkInDate: anotherBookingDate,
            numberOfNights: 5
        });
        expect(createResponse2.status).toBe(200);
        expect(createResponse2.data.guestName).toBe('GuestB');
        expect(createResponse2.data.unitID).toBe('1');

        // Now try to update the check-in date to overlap with the second booking
        let error: any;
        try {
            await axios.patch('http://localhost:8000/api/v1/booking', {
                guestName: GUEST_A_UNIT_1.guestName,
                unitID: GUEST_A_UNIT_1.unitID,
                checkInDate: new Date(new Date().getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                numberOfNights: 5
            });
        } catch (e) {
            error = e;
        }
        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(400);
        expect(error.response.data).toEqual('The updated booking would overlap with existing bookings for the same unit')
        // Now try to update the number of nights to overlap with the second booking
        let error2: any;
        try {
            await axios.patch('http://localhost:8000/api/v1/booking', {
                guestName: GUEST_A_UNIT_1.guestName,
                unitID: GUEST_A_UNIT_1.unitID,
                checkInDate: GUEST_A_UNIT_1.checkInDate,
                numberOfNights: 11
            });
        } catch (e) {
            error2 = e;
        }
        expect(error2).toBeInstanceOf(AxiosError);
        expect(error2.response.status).toBe(400);
        expect(error2.response.data).toEqual('The updated booking would overlap with existing bookings for the same unit');
    })
});
