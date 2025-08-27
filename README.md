# Booking Backend Challenge 
Original repo: [link](https://github.com/limehome/backend-challenge-typescript/tree/main?tab=readme-ov-file#backend-challenge---typescript)

## Challenge Completed by: He Wang

### Pre-assumptions:
From the provided code, I made the following assumptions:
- A guest can only book one unit at one time.
- No multiple bookings for the same unit is allowed for the same guest, regardless of the date, according to check 1 of the isBookingPossible function. (As a guest, I wouldn't mind making multiple bookings for the same unit as long as the dates don't overlap. But I will not change this rule as it is not part of the challenge)
- No multiple units can be booked by the same guest at any given time, according to check 2 of the isBookingPossible function (personally I find this rule too strict, but I will not change it as it is not part of the challenge)

### Bug Fix:
There was a bug in the booking API that allows double-booking of the same unit for an overlapping date range. 
The cause of the bug was that the API only checked whether the check-in date was the same instead of checking whether the duration of the stay overlaps with any existing bookings. 
This has been fixed by adding a more comprehensive check for overlapping bookings. Details of the fix can be found in the branch 'bugfix/multiple-occupancy'

### New Feature:
A new API endpoint has been added to allow guests to update their check-in date and duration of the stay for an existing booking.
The endpoint is `PATCH /api/v1/booking` and it takes the same parameters as the `POST /api/v1/booking` endpoint. Since a guest can only book one unit at a given time, the existing booking can be identified by the guest ID and the unit ID.
The API will allow guests to extend their stay if possible, but will return an error if the new date range overlaps with any existing bookings for the same unit.
The following is an example request to update a booking:

```json
{
  "guestId": "guest1",
  "unitId": "unit1",
  "checkInDate": "2023-10-05",
  "durationOfStay": 5
}
```
Limitations of the current implementation:
- The API assumes a booking is uniquely identified by the combination of guest ID and unit ID. This means that a guest cannot have multiple bookings for the same unit, even if the dates do not overlap.
- The API does not allow changing the unit ID of an existing booking. If a guest wants to change the unit, they will need to cancel the existing booking and create a new one.
- The API does not handle time zones. All dates are assumed to be in the same time zone.
- The API does not handle partial updates. All fields must be provided in the request body, even if only one field is being updated. Allowing partial updates involves handling partial data and/or new definition of the interface, which is difficult to achieve within the suggested time frame.
- The API only updates the check-in date and duration of stay. Other fields such as guest ID and unit ID cannot be updated since they are used to identify the booking.
- Because of the above limitations, the API behaves similar to http PUT method, but I chose to use PATCH as it is more appropriate for updates.

Details of the new feature can be found in the branch 'feature/modify-booking'. I have also updated the Swagger documentation to include the new endpoint.

## How to run (directly copied from original repo)

### Prerequisites

Make sure to have the following installed

- npm

### Setup


To get started, clone the repository locally and run the following

```shell
[~]$ ./init.sh
```

To make sure that everything is set up properly, open http://localhost:8000 in your browser, and you should see an OK message.
The logs should be looking like this

```shell
The server is running on http://localhost:8000
GET / 200 3.088 ms - 16
```

To navigate to the swagger docs, open the url http://localhost:8000/api-docs/


### Running tests

There was one failing test in the original code, but has since been fixed.
I needed to change the code of the test since the original version would still fail even after the bug was fixed.
This is due to the fact that the original test looks for the response code/data from an OK response, but expects a 400 code, which only happens when in an error response.

In addition, I have added new tests to cover the new feature of modifying an existing booking. The new tests cover the following scenarios:
- Successfully updating a booking to a new date range that does not overlap with existing bookings.
- Attempting to update a booking to a date range that overlaps with existing bookings, which should result in an error.

To run the tests, use the following command:

```shell
[~]$ npm run test
...
  Booking API
    ✓ Create fresh booking (67 ms)
    ✓ Same guest same unit booking (25 ms)
    ✓ Same guest different unit booking (14 ms)
    ✓ Different guest same unit booking (12 ms)
    ✓ Different guest same unit booking different date (22 ms)
    ✓ Guest updates the booking (23 ms)
    ✓ Guest updates the booking to an unavailable date (41 ms)
...
Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        1.49 s, estimated 2 s
Ran all test suites.
```
Please note that I didn't consider the code coverage as part of the challenge, so I didn't try to achieve 100% coverage. I have however ensured that the new feature is tested as thoroughly as possible within the time constraints.