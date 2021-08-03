import moment from "moment";

export const dateToYearDay = (day = 1, month = 1, year = 1970) => {
    const date = new Date(year, month-1, day);
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
};

export const dateToYearWeek = (day=1, month=1, year=1970) => {
    const date = `${year}-${month}-${day}`;
    const formattedDate = moment(date, 'YYYY-MM-DD').format('MM-DD-YYYY');
    return moment(formattedDate, 'MMDDYYYY').isoWeek();
};