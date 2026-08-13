import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RKU Technoplanet Backend API',
      version: '1.0.0',
      description: 'Complete API documentation for RKU Technoplanet Web & Mobile Applications (96 Endpoints across 12 Modules).',
      contact: {
        name: 'RKU Technoplanet Dev Team',
        email: 'support@rku.ac.in'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server'
      },
      {
        url: 'http://127.0.0.1:5000',
        description: 'Local IPv4 Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT Bearer token in the format: Bearer <token>'
        }
      }
    },
    paths: {
      // 1. HEALTH CHECK
      '/health': {
        get: {
          tags: ['Health Check'],
          summary: 'Check API Server Health',
          responses: { 200: { description: 'Server is healthy' } }
        }
      },

      // 2. AUTHENTICATION (12 endpoints)
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User Login (Student or Staff)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'student1@rku.ac.in' },
                    password: { type: 'string', example: 'student123' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Login successful' } }
        }
      },
      '/api/auth/register-student': {
        post: {
          tags: ['Authentication'],
          summary: 'Register Student Account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name', 'rollNo', 'department', 'semester'],
                  properties: {
                    email: { type: 'string', example: 'newstudent@rku.ac.in' },
                    password: { type: 'string', example: 'Student#123' },
                    name: { type: 'string', example: 'Rahul Sharma' },
                    rollNo: { type: 'string', example: 'SOE2024099' },
                    department: { type: 'string', example: 'Computer Engineering' },
                    semester: { type: 'integer', example: 4 },
                    phone: { type: 'string', example: '9876543299' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Student registered' } }
        }
      },
      '/api/auth/register-staff': {
        post: {
          tags: ['Authentication'],
          summary: 'Register Staff Account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name', 'role'],
                  properties: {
                    email: { type: 'string', example: 'newfaculty@rku.ac.in' },
                    password: { type: 'string', example: 'Faculty#123' },
                    name: { type: 'string', example: 'Prof. Amit Shah' },
                    role: { type: 'string', enum: ['ADMIN', 'FACULTY', 'VOLUNTEER'], example: 'FACULTY' },
                    phone: { type: 'string', example: '9988776611' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Staff registered' } }
        }
      },
      '/api/auth/refresh-token': {
        post: {
          tags: ['Authentication'],
          summary: 'Refresh JWT Access Token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } }
                }
              }
            }
          },
          responses: { 200: { description: 'Token refreshed' } }
        }
      },
      '/api/auth/forgot-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Request Password Reset OTP',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', example: 'student1@rku.ac.in' } }
                }
              }
            }
          },
          responses: { 200: { description: 'OTP sent' } }
        }
      },
      '/api/auth/verify-otp': {
        post: {
          tags: ['Authentication'],
          summary: 'Verify OTP Code',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp'],
                  properties: { email: { type: 'string' }, otp: { type: 'string' } }
                }
              }
            }
          },
          responses: { 200: { description: 'OTP verified' } }
        }
      },
      '/api/auth/resend-otp': {
        post: {
          tags: ['Authentication'],
          summary: 'Resend Verification OTP',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string' } }
                }
              }
            }
          },
          responses: { 200: { description: 'OTP resent' } }
        }
      },
      '/api/auth/reset-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Reset Password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'otp', 'newPassword'],
                  properties: { email: { type: 'string' }, otp: { type: 'string' }, newPassword: { type: 'string' } }
                }
              }
            }
          },
          responses: { 200: { description: 'Password reset successful' } }
        }
      },
      '/api/auth/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'User Logout',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Logged out' } }
        }
      },
      '/api/auth/change-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Change User Password',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } }
                }
              }
            }
          },
          responses: { 200: { description: 'Password changed' } }
        }
      },
      '/api/auth/profile': {
        get: {
          tags: ['Authentication'],
          summary: 'Get Current User Profile',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Profile details' } }
        },
        put: {
          tags: ['Authentication'],
          summary: 'Update Current User Profile',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Profile updated' } }
        }
      },

      // 3. EVENTS (9 endpoints)
      '/api/events': {
        get: {
          tags: ['Events'],
          summary: 'Get All Active Events',
          responses: { 200: { description: 'List of events' } }
        }
      },
      '/api/events/upcoming': {
        get: {
          tags: ['Events'],
          summary: 'Get Upcoming Events',
          responses: { 200: { description: 'Upcoming events' } }
        }
      },
      '/api/events/completed': {
        get: {
          tags: ['Events'],
          summary: 'Get Completed Events',
          responses: { 200: { description: 'Completed events' } }
        }
      },
      '/api/events/my-events': {
        get: {
          tags: ['Events'],
          summary: 'Get Student Registered Events',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Student events' } }
        }
      },
      '/api/events/search': {
        get: {
          tags: ['Events'],
          summary: 'Search Events by Query',
          parameters: [{ in: 'query', name: 'q', schema: { type: 'string' } }],
          responses: { 200: { description: 'Search results' } }
        }
      },
      '/api/events/category/{categoryId}': {
        get: {
          tags: ['Events'],
          summary: 'Get Events By Category ID',
          parameters: [{ in: 'path', name: 'categoryId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Events in category' } }
        }
      },
      '/api/events/{id}': {
        get: {
          tags: ['Events'],
          summary: 'Get Event Details By ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Event details' } }
        }
      },
      '/api/events/register': {
        post: {
          tags: ['Events'],
          summary: 'Register Student For Event',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['eventId'], properties: { eventId: { type: 'string' } } }
              }
            }
          },
          responses: { 201: { description: 'Registration initiated' } }
        }
      },
      '/api/events/register/{id}': {
        delete: {
          tags: ['Events'],
          summary: 'Cancel Event Registration',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Registration cancelled' } }
        }
      },

      // 4. STUDENT PORTAL (6 endpoints)
      '/api/student/dashboard': {
        get: {
          tags: ['Student Portal'],
          summary: 'Get Student Dashboard Summary',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Dashboard metrics' } }
        }
      },
      '/api/student/notifications': {
        get: {
          tags: ['Student Portal'],
          summary: 'Get Student Notifications',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Notifications list' } }
        }
      },
      '/api/student/scores': {
        get: {
          tags: ['Student Portal'],
          summary: 'Get Student Scores Across All Events',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Scores list' } }
        }
      },
      '/api/student/scores/{eventId}': {
        get: {
          tags: ['Student Portal'],
          summary: 'Get Student Score For Event',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Event score' } }
        }
      },
      '/api/student/rank/{eventId}': {
        get: {
          tags: ['Student Portal'],
          summary: 'Get Student Rank For Event',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Event rank' } }
        }
      },
      '/api/student/leaderboard/{eventId}': {
        get: {
          tags: ['Student Portal'],
          summary: 'Get Event Leaderboard',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Leaderboard list' } }
        }
      },

      // 5. EVENT PASS & QR (2 endpoints)
      '/api/event-pass/{registrationId}': {
        get: {
          tags: ['Event Pass & QR'],
          summary: 'Get Digital Pass with QR Code',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'registrationId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Pass details' } }
        }
      },
      '/api/event-qr/{registrationId}': {
        get: {
          tags: ['Event Pass & QR'],
          summary: 'Get QR Verification Code Payload',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'registrationId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'QR code payload' } }
        }
      },

      // 6. CERTIFICATES (2 endpoints)
      '/api/certificates': {
        get: {
          tags: ['Certificates'],
          summary: 'Get Earned Certificates',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Certificates list' } }
        }
      },
      '/api/certificates/{id}/download': {
        get: {
          tags: ['Certificates'],
          summary: 'Download Certificate PDF',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Certificate file download' } }
        }
      },

      // 7. PAYMENTS (4 endpoints)
      '/api/payment/create-order': {
        post: {
          tags: ['Payments'],
          summary: 'Create Payment Transaction Order',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Order created' } }
        }
      },
      '/api/payment/verify': {
        post: {
          tags: ['Payments'],
          summary: 'Verify Gateway Payment',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Payment status' } }
        }
      },
      '/api/payment/history': {
        get: {
          tags: ['Payments'],
          summary: 'Get Payment History',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Transaction history' } }
        }
      },
      '/api/payment/{paymentId}': {
        get: {
          tags: ['Payments'],
          summary: 'Get Payment Transaction Details',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'paymentId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Payment details' } }
        }
      },

      // 8. FEEDBACK (2 endpoints)
      '/api/feedback/{eventId}': {
        get: {
          tags: ['Feedback'],
          summary: 'Get Reviews & Ratings for Event',
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Reviews list' } }
        }
      },
      '/api/feedback': {
        post: {
          tags: ['Feedback'],
          summary: 'Submit Event Feedback',
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Feedback submitted' } }
        }
      },

      // 9. GALLERY (2 endpoints)
      '/api/gallery': {
        get: {
          tags: ['Gallery'],
          summary: 'Get Event Photos Gallery',
          responses: { 200: { description: 'Gallery photos' } }
        }
      },
      '/api/gallery/{year}': {
        get: {
          tags: ['Gallery'],
          summary: 'Get Gallery Photos By Year',
          parameters: [{ in: 'path', name: 'year', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Gallery list' } }
        }
      },

      // 10. FACULTY PORTAL (19 endpoints)
      '/api/faculty/dashboard': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Faculty Overview Dashboard',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Dashboard data' } }
        }
      },
      '/api/faculty/events': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get Assigned Faculty Events',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Assigned events' } }
        }
      },
      '/api/faculty/events/{id}': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get Assigned Event Details',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Event details' } }
        }
      },
      '/api/faculty/events/{eventId}/participants': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get Event Participant Roster',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Participants list' } }
        }
      },
      '/api/faculty/participant/{id}': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get Participant Profile Details',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Participant profile' } }
        }
      },
      '/api/faculty/attendance/scan': {
        post: {
          tags: ['Faculty Portal'],
          summary: 'Mark Attendance via QR Scan',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Attendance updated' } }
        }
      },
      '/api/faculty/attendance/manual': {
        post: {
          tags: ['Faculty Portal'],
          summary: 'Mark Attendance Manually',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Attendance updated' } }
        }
      },
      '/api/faculty/attendance/{eventId}': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get Event Attendance List',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Attendance list' } }
        }
      },
      '/api/faculty/score': {
        post: {
          tags: ['Faculty Portal'],
          summary: 'Enter Participant Score',
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Score entered' } }
        }
      },
      '/api/faculty/score/{id}': {
        put: {
          tags: ['Faculty Portal'],
          summary: 'Edit Participant Score',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Score updated' } }
        }
      },
      '/api/faculty/score/{eventId}': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get Event Scores',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Scores list' } }
        }
      },
      '/api/faculty/declare-rank': {
        post: {
          tags: ['Faculty Portal'],
          summary: 'Publish Event Rankings',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Rankings published' } }
        }
      },
      '/api/faculty/rank/{eventId}': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'View Event Rankings',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'eventId', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Rankings list' } }
        }
      },
      '/api/faculty/volunteer': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get List of Volunteers',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Volunteers list' } }
        },
        post: {
          tags: ['Faculty Portal'],
          summary: 'Assign Volunteer to Event',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Volunteer assigned' } }
        }
      },
      '/api/faculty/volunteer/{id}': {
        delete: {
          tags: ['Faculty Portal'],
          summary: 'Remove Volunteer',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Volunteer removed' } }
        }
      },
      '/api/faculty/coordinator': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Get List of Faculty Coordinators',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Coordinators list' } }
        }
      },
      '/api/faculty/payment-history': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'View Assigned Event Payment Collections',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Collections history' } }
        }
      },
      '/api/faculty/report': {
        get: {
          tags: ['Faculty Portal'],
          summary: 'Download Faculty Summary Report',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Faculty report' } }
        }
      },

      // 11. VOLUNTEER / COORDINATOR PORTAL (5 endpoints)
      '/api/coordinator/dashboard': {
        get: {
          tags: ['Volunteer Portal'],
          summary: 'Volunteer Dashboard Overview',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Volunteer dashboard data' } }
        }
      },
      '/api/coordinator/events': {
        get: {
          tags: ['Volunteer Portal'],
          summary: 'Get Assigned Volunteer Events',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Volunteered events' } }
        }
      },
      '/api/coordinator/participants': {
        get: {
          tags: ['Volunteer Portal'],
          summary: 'View Event Participants',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Participants list' } }
        }
      },
      '/api/coordinator/attendance': {
        get: {
          tags: ['Volunteer Portal'],
          summary: 'View & Record Event Attendance',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Attendance roster' } }
        }
      },
      '/api/coordinator/announcements': {
        get: {
          tags: ['Volunteer Portal'],
          summary: 'View Event Announcements',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Announcements list' } }
        }
      },

      // 12. ADMIN PORTAL (30 endpoints)
      '/api/admin/dashboard': {
        get: {
          tags: ['Admin Management'],
          summary: 'Master Admin Dashboard',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Admin master dashboard' } }
        }
      },
      '/api/admin/statistics': {
        get: {
          tags: ['Admin Management'],
          summary: 'Global System Analytics & Metrics',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Analytics statistics' } }
        }
      },
      '/api/admin/events': {
        post: {
          tags: ['Admin Management'],
          summary: 'Create New Event',
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Event created' } }
        }
      },
      '/api/admin/events/{id}': {
        put: {
          tags: ['Admin Management'],
          summary: 'Edit Event Details',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Event updated' } }
        },
        delete: {
          tags: ['Admin Management'],
          summary: 'Delete Event',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Event deleted' } }
        }
      },
      '/api/admin/categories': {
        get: {
          tags: ['Admin Management'],
          summary: 'Get All Categories',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Categories list' } }
        },
        post: {
          tags: ['Admin Management'],
          summary: 'Create New Category',
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Category created' } }
        }
      },
      '/api/admin/categories/{id}': {
        put: {
          tags: ['Admin Management'],
          summary: 'Edit Category',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Category updated' } }
        },
        delete: {
          tags: ['Admin Management'],
          summary: 'Delete Category',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Category deleted' } }
        }
      },
      '/api/admin/students': {
        get: {
          tags: ['Admin Management'],
          summary: 'Get All Student Accounts',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Students list' } }
        }
      },
      '/api/admin/students/{id}': {
        get: {
          tags: ['Admin Management'],
          summary: 'Get Student Details',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Student details' } }
        },
        put: {
          tags: ['Admin Management'],
          summary: 'Update Student Account',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Student updated' } }
        },
        delete: {
          tags: ['Admin Management'],
          summary: 'Delete Student Account',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Student deleted' } }
        }
      },
      '/api/admin/faculty': {
        get: {
          tags: ['Admin Management'],
          summary: 'Get Staff List (Faculty & Volunteers)',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Staff list' } }
        },
        post: {
          tags: ['Admin Management'],
          summary: 'Create Staff Account',
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Staff created' } }
        }
      },
      '/api/admin/faculty/{id}': {
        put: {
          tags: ['Admin Management'],
          summary: 'Update Staff Account',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Staff updated' } }
        },
        delete: {
          tags: ['Admin Management'],
          summary: 'Delete Staff Account',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Staff deleted' } }
        }
      },
      '/api/admin/payments': {
        get: {
          tags: ['Admin Management'],
          summary: 'Master Payments Log',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Payments log' } }
        }
      },
      '/api/admin/payments/{id}': {
        get: {
          tags: ['Admin Management'],
          summary: 'Get Payment Details',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Payment details' } }
        }
      },
      '/api/admin/payment/refund': {
        post: {
          tags: ['Admin Management'],
          summary: 'Issue Payment Refund',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Refund processed' } }
        }
      },
      '/api/admin/security/logs': {
        get: {
          tags: ['Admin Management'],
          summary: 'View Audit Logs',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Audit logs' } }
        }
      },
      '/api/admin/security/blocked-users': {
        get: {
          tags: ['Admin Management'],
          summary: 'List Blocked User Accounts',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Blocked users list' } }
        }
      },
      '/api/admin/security/block-user/{id}': {
        put: {
          tags: ['Admin Management'],
          summary: 'Block User Account',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'User blocked' } }
        }
      },
      '/api/admin/security/unblock-user/{id}': {
        put: {
          tags: ['Admin Management'],
          summary: 'Unblock User Account',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'User unblocked' } }
        }
      },
      '/api/admin/gallery': {
        post: {
          tags: ['Admin Management'],
          summary: 'Add Photo to Gallery',
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Photo added' } }
        }
      },
      '/api/admin/gallery/{id}': {
        delete: {
          tags: ['Admin Management'],
          summary: 'Remove Photo from Gallery',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Photo removed' } }
        }
      },
      '/api/admin/notification/send': {
        post: {
          tags: ['Admin Management'],
          summary: 'Broadcast Announcement',
          security: [{ BearerAuth: [] }],
          responses: { 201: { description: 'Announcement sent' } }
        }
      },
      '/api/admin/notifications': {
        get: {
          tags: ['Admin Management'],
          summary: 'Get Sent Announcements',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Announcements list' } }
        }
      },
      '/api/admin/report/events': {
        get: {
          tags: ['Admin Management'],
          summary: 'Master Events Report',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Events report' } }
        }
      },
      '/api/admin/report/payments': {
        get: {
          tags: ['Admin Management'],
          summary: 'Master Payments Report',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Payments report' } }
        }
      },
      '/api/admin/report/winners': {
        get: {
          tags: ['Admin Management'],
          summary: 'Master Winners Report',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Winners report' } }
        }
      },

      // 13. STAFF PORTAL
      '/api/staff/profile': {
        get: {
          tags: ['Staff Portal'],
          summary: 'Get Authenticated Staff Profile',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Staff profile retrieved successfully' } }
        }
      },
      '/api/staff/auth/register': {
        post: {
          tags: ['Staff Portal'],
          summary: 'Staff Direct Registration',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', example: 'staff@rku.ac.in' },
                    password: { type: 'string', example: 'Staff#123' },
                    name: { type: 'string', example: 'Dr. Anita Patel' },
                    department: { type: 'string', example: 'Computer Science' }
                  }
                }
              }
            }
          },
          responses: { 201: { description: 'Staff registered successfully' } }
        }
      },
      '/api/staff/auth/login': {
        post: {
          tags: ['Staff Portal'],
          summary: 'Staff Direct Login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'staff@rku.ac.in' },
                    password: { type: 'string', example: 'Staff#123' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Staff login successful' } }
        }
      }
    }
  },
  apis: ['./src/routes/*.routes.js', './src/controllers/*.controller.js']
};

export const swaggerSpec = swaggerJsdoc(options);
