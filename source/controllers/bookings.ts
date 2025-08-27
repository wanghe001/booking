import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma'

interface Booking {
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
}

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        message: "OK"
    })
}

const createBooking = async (req: Request, res: Response, next: NextFunction) => {
    const booking: Booking = req.body;

    let outcome = await isBookingPossible(booking);
    if (!outcome.result) {
        return res.status(400).json(outcome.reason);
    }

    let bookingResult = await prisma.booking.create({
        data: {
             guestName: booking.guestName,
             unitID: booking.unitID,
             checkInDate: new Date(booking.checkInDate),
             numberOfNights: booking.numberOfNights
       }
    })

    return res.status(200).json(bookingResult);
}

const updateBooking = async (req: Request, res: Response, next: NextFunction) => {
    const updatedBooking: Booking = req.body;
    let existingBookings = await prisma.booking.findMany({
        where: {
            AND: {
                guestName: {
                    equals: updatedBooking.guestName,
                },
                unitID: {
                    equals: updatedBooking.unitID
                },
            }
        }
    });
    if (existingBookings.length === 0) {
        return res.status(400).json("Booking not found");
    }
    if (existingBookings.length > 1) {
        return res.status(400).json("Multiple bookings found for the same guest and unit. Please contact the developer.");
    }
    const existingBooking = existingBookings[0];

    let isUpdatePossible = await isUpdateBookingPossible(updatedBooking, existingBooking.id);
    if (!isUpdatePossible.result) {
        return res.status(400).json(isUpdatePossible.reason);
    }

    let bookingResult = await prisma.booking.update({
        where: {
            id: existingBooking.id
        },
        data: {
             checkInDate: new Date(updatedBooking.checkInDate),
             numberOfNights: updatedBooking.numberOfNights
       }
    })

    return res.status(200).json(bookingResult);
}

type bookingOutcome = {result:boolean, reason:string};

async function isUpdateBookingPossible(updatedBooking: Booking, existingBookingId: number): Promise<bookingOutcome> {

    const newCheckOutDate = new Date(updatedBooking.checkInDate);
    newCheckOutDate.setDate(newCheckOutDate.getDate() + updatedBooking.numberOfNights);
    // Now check if the update would overlap with other bookings
    let overlappingBookings = await prisma.booking.findMany({
        where: {
            AND: {
                checkInDate: {
                    lt: newCheckOutDate
                },
                unitID: {
                    equals: updatedBooking.unitID,
                }
            }
        }
    });
    overlappingBookings= overlappingBookings.filter(b => {
        if (b.id === existingBookingId) {
            return false; // skip the existing booking
        }
        const bCheckOutDate = new Date(b.checkInDate);
        bCheckOutDate.setDate(bCheckOutDate.getDate() + b.numberOfNights);
        return bCheckOutDate > new Date(updatedBooking.checkInDate);
    });
    if (overlappingBookings.length > 0) {
        return {result: false, reason: "The updated booking would overlap with existing bookings for the same unit"};
    }
    return {result: true, reason: "OK"};

}

async function isBookingPossible(booking: Booking): Promise<bookingOutcome> {
    // check 1 : The Same guest cannot book the same unit multiple times
    let sameGuestSameUnit = await prisma.booking.findMany({
        where: {
            AND: {
                guestName: {
                    equals: booking.guestName,
                },
                unitID: {
                    equals: booking.unitID,
                },
            },
        },
    });
    if (sameGuestSameUnit.length > 0) {
        return {result: false, reason: "The given guest name cannot book the same unit multiple times"};
    }

    // check 2 : the same guest cannot be in multiple units at the same time
    let sameGuestAlreadyBooked = await prisma.booking.findMany({
        where: {
            guestName: {
                equals: booking.guestName,
            },
        },
    });
    if (sameGuestAlreadyBooked.length > 0) {
        return {result: false, reason: "The same guest cannot be in multiple units at the same time"};
    }

    // check 3 : Unit is available for the check-in date
    const checkOutDate = new Date(booking.checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + booking.numberOfNights);
    // first find all bookings for the same unit where the check-in date is before the requested check-out date
    let isUnitAvailableOnCheckInDate = await prisma.booking.findMany({
        where: {
            AND: {
                checkInDate: {
                    lt: checkOutDate
                },
                unitID: {
                    equals: booking.unitID,
                }
            }
        }
    });

    // then filter out the bookings where the check-out date is before the requested check-in date
    isUnitAvailableOnCheckInDate = isUnitAvailableOnCheckInDate.filter(b => {
        const bCheckOutDate = new Date(b.checkInDate);
        bCheckOutDate.setDate(bCheckOutDate.getDate() + b.numberOfNights);
        return bCheckOutDate > new Date(booking.checkInDate);
    });
    if (isUnitAvailableOnCheckInDate.length > 0) {
        return {result: false, reason: "For the given check-in date, the unit is already occupied"};
    }

    return {result: true, reason: "OK"};
}

export default { healthCheck, createBooking, updateBooking }
