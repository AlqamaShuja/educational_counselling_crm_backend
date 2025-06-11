const errorMiddleware = (error, req, res, next) => {
    console.error(res.statusCode, ', Error:', error.message);
  
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
      error: error.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  };
  
  module.exports = errorMiddleware;