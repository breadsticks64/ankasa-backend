const bookingModel = require("../model/booking");
const creditCardModel = require("../model/creditCard");
const passengersModel = require("../model/passengers");
const commonHelper = require("../helper/common");
const { v4: uuidv4 } = require("uuid");
const flightsModel = require("../model/flights");

const getAllBookings = async (req, res) => {
    try {
        //Search and pagination query
        const filter = req.query.filter || 'name';
        const searchQuery = req.query.search || '';
        const sortBy = req.query.sortBy || 'name';
        const sort = req.query.sort || 'asc';
        const limit = Number(req.query.limit) || 6;
        const page = Number(req.query.page) || 1;
        const offset = (page - 1) * limit;

        //Get all bookings from database
        const results = await bookingModel
            .selectAllBooking(searchQuery, sortBy, sort, limit, offset);

        //Return not found if there's no workers in database
        if (!results.rowCount) return commonHelper
            .response(res, null, 404, "Bookings not found");

        //Pagination info
        const totalData = Number(results.rowCount);
        const totalPage = Math.ceil(totalData / limit);
        const pagination = { currentPage: page, limit, totalData, totalPage };

        //Response
        commonHelper.response(res, results.rows, 200,
            "Get all bookings successful", pagination);
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed getting all bookings");
    }
}

const getUserBooking = async (req, res) => {
    try {
        //Get request data
        const id_user = req.payload.id;

        //Search and pagination query
        const searchQuery = req.query.search || '';
        const sortBy = req.query.sortBy || 'name';
        const sort = req.query.sort || 'asc';
        const limit = Number(req.query.limit) || 6;
        const page = Number(req.query.page) || 1;
        const offset = (page - 1) * limit;

        //Get all bookings from database
        const results = await bookingModel.selectUserBooking(id_user, searchQuery, sortBy, sort, limit, offset)

        //Return not found if there's no workers in database
        if (!results.rowCount) return commonHelper
            .response(res, null, 404, "User booking not found");

        //Pagination info
        const totalData = Number(results.rowCount);
        const totalPage = Math.ceil(totalData / limit);
        const pagination = { currentPage: page, limit, totalData, totalPage };

        //Response
        commonHelper.response(res, results.rows, 200,
            "Get all user booking successful", pagination);
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed getting user booking");
    }
}

const getDetailBooking = async (req, res) => {
    try {
        //Get request data
        const id = req.params.id;

        //Get all bookings from database
        const results = await bookingModel.selectDetailBooking(id)

        //Return not found if there's no passengers in database
        if (!results.rowCount) return commonHelper
            .response(res, null, 404, "Booking detail not found");

        const passengersResult = await passengersModel.selectBookingPassengers(id);
        results.rows[0].passengers = passengersResult.rows;

        //Response
        commonHelper.response(res, results.rows, 200,
            "Get detail successful");
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed getting detail booking");
    }
}

const createBooking = async (req, res) => {
    try {
        //Get requests
        const id_flight = req.params.id_flight;
        const id_user = req.payload.id;
        const data = req.body;
        const passengers = req.body.passengers ? req.body.passengers : [];

        //Get preffered credit card
        const creditCardResults = await creditCardModel.selectDetailCredit(id_user);
        if (!creditCardResults.rowCount) return commonHelper.response(res, null, 404,
            "User doesn't have a credit card");
        const prefferedCreditCard = creditCardResults.rows.filter((value) => {
            if (value.preffered) return value
        })

        //Get preffered credit card balance
        const id_credit_card = prefferedCreditCard[0].id;
        const creditCardBalance = prefferedCreditCard[0].balance;

        //Find flight id
        const findFlight = await flightsModel.findId(id_flight);
        if (!findFlight.rowCount) return commonHelper
            .response(res, null, 404, "Flight id not found");

        //Get flight current capacity
        const capacity = parseInt(findFlight.rows[0].capacity);

        //Booking metadata
        data.id = uuidv4();
        data.id_user = id_user;
        data.id_flight = id_flight;
        data.id_credit_card = id_credit_card;
        data.created_at = Date.now();
        data.status = 1; //Waiting for payment

        //Calculate the total of ticket price
        let totalPrice = 0;
        passengers.forEach(() => { 
            totalPrice += parseInt(findFlight.rows[0].price);
        })
        if (data.insurance == true) totalPrice += 20000;

        //Subtract the flight's ticket capacity by the number of passengers
        let newCapacity = 0;
        if (capacity < passengers.length) {
            return commonHelper.response(res, null, 403, "Passenger is more than flight's capacity");
        } else {
            newCapacity = capacity - passengers.length;
            const flightResult = await flightsModel.updateCapacity(id_flight, newCapacity)
        }

        //Subtract the user's credit card balance by flight ticket price
        let newBalance = 0;
        if (creditCardBalance < totalPrice) {
            return commonHelper.response(res, null, 403, "Insufficient credit card balance");
        } else {
            newBalance = creditCardBalance - totalPrice;
            const creditCardResult = await creditCardModel.updateBalance(id_credit_card, newBalance)
        }

        //Insert booking to database
        const result = await bookingModel.insertBooking(data);

        //insert passengers
        const id_booking = data.id;
        passengers.forEach(async (element) => {
            element.id = uuidv4();
            element.id_booking = id_booking;
            element.passenger_type = element.passenger_type ? element.passenger_type : 1;
            const passengersResult = await passengersModel.insertPassengers(element);
        });

        //Response
        commonHelper.response(res, result.rows, 200,
            "Create booking successful, total ticket price is " + totalPrice + " , credit balance is " + newBalance + ", new flight capacity is "+newCapacity);
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed creating booking");
    }
}

const updateBooking = async (req, res) => {
    try {
        //Get requests
        const id = req.params.id;
        const id_user = req.payload.id;
        const data = req.body;

        const findBooking = await bookingModel.findId(id);
        if (!findBooking.rowCount) return commonHelper
            .response(res, null, 404, "Booking id not found");

        //Get preffered credit card
        const creditCardResults = await creditCardModel.selectDetailCredit(id_user);
        if (!creditCardResults.rowCount) return commonHelper.response(res, result.rows, 404,
            "User doesn't have a credit card");
        const prefferedCreditCard = creditCardResults.rows.filter((value) => {
            return value.preffered = true
        })
        const id_credit_card = prefferedCreditCard[0].id_credit_card;

        //Booking metadata
        data.id = id;
        data.id_user = id_user;
        data.id_credit_card = id_credit_card;

        //Insert booking to database
        const result = await bookingModel.updateBooking(data)

        //Response
        commonHelper.response(res, result.rows, 200,
            "Update booking successful");
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed updating booking");
    }
}

const deleteBooking = async (req, res) => {
    try {
        //Get requests
        const id = req.params.id;

        const findBooking = await bookingModel.findId(id);
        if (!findBooking.rowCount) return commonHelper
            .response(res, null, 404, "Booking id not found");

        //Insert booking to database
        const result = await bookingModel.deleteBooking(id);

        //Response
        commonHelper.response(res, result.rows, 200,
            "Delete booking successful");
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed updating booking");
    }
}

const setStatusBooking = async (req, res) => {
    try {
        //Get requests
        const id = req.params.id;
        const status = req.body.status;

        const findBooking = await bookingModel.findId(id);
        if (!findBooking.rowCount) return commonHelper
            .response(res, null, 404, "Booking id not found");

        //Insert booking to database
        const result = await bookingModel.setBookingStatus(id, status)

        //Response
        commonHelper.response(res, result.rows, 200,
            "Set booking status successful");
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed set booking status");
    }
}

const cancelBooking = async (req, res) => {
    try {
        //Get requests
        const id = req.params.id;
        const status = req.body.status;

        const findBooking = await bookingModel.findId(id);
        if (!findBooking.rowCount) return commonHelper
            .response(res, null, 404, "Booking id not found");

        //Cancel booking if status is waiting for payment
        let result;
        if (findBooking.rows[0].status == 1) {
            result = await bookingModel.setBookingStatus(id, status)
        } else {
            return commonHelper.response(res, result.rows, 403,
                "Cancelling issued E-Ticket is forbidden");
        }

        //Response
        commonHelper.response(res, result.rows, 200,
            "Set booking status successful");
    } catch (error) {
        console.log(error);
        commonHelper.response(res, null, 500, "Failed set booking status");
    }
}

module.exports = {
    getAllBookings,
    getDetailBooking,
    getUserBooking,
    createBooking,
    updateBooking,
    deleteBooking,
    setStatusBooking,
    cancelBooking
}