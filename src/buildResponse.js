export const errorResponse = (error="An error occurred", message="Failed", httpStatus=400) => {
    const status = false;
    const body = {
        status, message, error
    };
    return {
        statusCode: httpStatus,
        body: JSON.stringify(body)
    };
};

export const successResponse = (data=[], message="Successful", httpStatus=200) => {
    const status = true;
    const body = {
        status, message, data
    };

    return {
        statusCode: httpStatus,
        body: JSON.stringify(body)
    };
};