import { errorResponse, successResponse } from "./buildResponse";
import dynamoDb from "./libs/dynamodb";
import { dateToYearDay, dateToYearWeek } from "./libs/helpers/date-helper";
import { roundDecimal } from "./libs/helpers/math-helper";

export const getWpcData = async (event, context) => {
    const queryParams = event.queryStringParameters;
    // basic validation
    if (!queryParams || !queryParams.hasOwnProperty("id")
        || !queryParams.hasOwnProperty("site") || !queryParams.hasOwnProperty("company")
        || !queryParams.hasOwnProperty("month") || !queryParams.hasOwnProperty("year")
    ) {
        return errorResponse("Query parameter(s) missing");
    }

    if (isNaN(queryParams.id) || isNaN(queryParams.month) || isNaN(queryParams.year)) {
        return errorResponse("id, month and year should be type 'Number'");
    }
    queryParams.firstDay = 1;
    queryParams.lastDay = 28;

    try {
        const monthDailyWastes = await getMonthDailyWastes(queryParams);
        const monthWeeklyCovers = await getMonthWeeklyCovers(queryParams);
        const wastePerCover = computeWastePerCover(monthDailyWastes, monthWeeklyCovers, queryParams);
        // return successResponse(monthDailyWastes);
        // return successResponse(monthWeeklyCovers);
        return successResponse(wastePerCover, "Waste per Cover data retrieved successfully");
    } catch(err) {
        console.log(err);
        return errorResponse(err.message, "An error occurred", 500);
    }
};

const computeWastePerCover = (monthDailyWastes, monthWeeklyCovers, queryParams) => {
    let wastePerCoverForCoverWaste = [];
    let wastePerCoverForPreparationWaste = [];
    let wastePerCoverForSpoilageWaste = [];
    let wastePerCoverForAllWaste = [];
    let xAxis = [];
    let [totalCW, totalSW, totalPW, totalCoverInputs, weekCount, wasteDayCount] = new Array(6).fill(0);
    const month = queryParams.month;
    const site = queryParams.site;

    // monthWeeklyCovers.length can be 4 or 5 | 4 for predictability
    while (weekCount < 4) {
        let currWeekCovers = monthWeeklyCovers[weekCount].coversInput;

        console.log("monthWeeklyCovers Length", monthWeeklyCovers.length, "currWeekCovers Length", currWeekCovers.length);
        for(let dayCount = 0; dayCount < currWeekCovers.length; dayCount++) {
            let currDayCover = currWeekCovers[dayCount];
            let currDayWastes = monthDailyWastes[wasteDayCount];

            console.log("wasteDayCount", wasteDayCount, "dayCount", dayCount, "weekCount", weekCount, "currDayCover", currDayCover, "currDayWastes", currDayWastes);
            // waste categories
            let dayMaxRecordedCW = Math.max(...currDayWastes.coverWaste);
            let dayMaxRecordedPW = Math.max(...currDayWastes.preparationWaste);
            let dayMaxRecordedSW = Math.max(...currDayWastes.spoilageWaste);
            let dayTotalMaxRecordedW = dayMaxRecordedCW + dayMaxRecordedPW + dayMaxRecordedSW;

            console.log("dayMaxRecordedCW", dayMaxRecordedCW, "dayMaxRecordedPW", dayMaxRecordedPW, "dayMaxRecordedSW", dayMaxRecordedSW);

            if (currDayCover !== 0) {
                // Averaging
                let [dayWpcCW, dayWpcPW, dayWpcSW, dayWpcTotal] = [dayMaxRecordedCW, dayMaxRecordedPW, dayMaxRecordedSW, dayTotalMaxRecordedW]
                    .map(item => roundDecimal(item/currDayCover));
                wastePerCoverForCoverWaste.push(dayWpcCW);
                wastePerCoverForPreparationWaste.push(dayWpcPW);
                wastePerCoverForSpoilageWaste.push(dayWpcSW);
                wastePerCoverForAllWaste.push(dayWpcTotal);
            } else {
                wastePerCoverForCoverWaste.push(0);
                wastePerCoverForPreparationWaste.push(0);
                wastePerCoverForSpoilageWaste.push(0);
                wastePerCoverForAllWaste.push(0);
            }

            xAxis.push(wasteDayCount+1);
            totalCW += dayMaxRecordedCW;
            totalPW += dayMaxRecordedPW;
            totalSW += dayMaxRecordedSW;
            totalCoverInputs += currDayCover;

            wasteDayCount++;
        }

        weekCount++;
    }
    [totalCW, totalSW, totalPW] = [totalCW, totalSW, totalPW]
        .map(item => roundDecimal(item));
    let totalWaste = totalCW + totalSW + totalPW;

    return {
        wastePerCoverForCoverWaste, wastePerCoverForPreparationWaste, wastePerCoverForSpoilageWaste,
        wastePerCoverForAllWaste, totalCW, totalSW, totalPW, totalWaste, totalCoverInputs,
        xAxis, month, site
    };
};

const getMonthDailyWastes = async ({month, year, id, company, site, firstDay, lastDay}) => {
    const dailyElectricalData = {
        TableName: `${id}_${company}_allReports`,
        KeyConditionExpression: "site = :site",
        ExpressionAttributeValues: {
            ":site": `${site}_dailyElectricalData_${year}`,
        },
        ProjectionExpression: `siteName, dayOfTheYear`,
    };
    const response = await dynamoDb.query(dailyElectricalData);
    console.log("MonthDailyWastes", response);
    const items = response.Items;

    if (items.length === 0) return [];
    const startDay = dateToYearDay(firstDay, month, year);
    const endDay = dateToYearDay(lastDay, month, year);
    console.log("startDay", startDay, "endDay", endDay);

    const monthDailyWastes = items[0].dayOfTheYear.slice(startDay-1, endDay);
    console.log("monthDailyWastes Length", monthDailyWastes.length);
    return monthDailyWastes;
};

const getMonthWeeklyCovers = async ({month, year, id, company, site, firstDay, lastDay}) => {
    const coverInput = {
        TableName: `${id}_${company}_allReports`,
        KeyConditionExpression: "site = :site",
        ExpressionAttributeValues: {
            ":site": `${site}_weeklyCoversInput_${year}`,
        },
        ProjectionExpression: `siteName, weeklyCovers`,
    };
    const response = await dynamoDb.query(coverInput);
    console.log("MonthWeeklyCovers", response);
    const items = response.Items;

    if (items.length === 0) return [];
    const startWeek = dateToYearWeek(firstDay, month, year);
    const endWeek = dateToYearWeek(lastDay, month, year);
    console.log("startWeek", startWeek, "endWeek", endWeek);

    const monthWeeklyCovers = items[0].weeklyCovers.slice(startWeek-1, endWeek);
    console.log("monthWeeklyCovers Length", monthWeeklyCovers.length);
    return monthWeeklyCovers;
};