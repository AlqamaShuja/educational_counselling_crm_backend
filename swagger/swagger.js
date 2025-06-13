const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const PORT = process.env.PORT || 3000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Educational Consultancy Management CRM API',
      version: '1.0.0',
      description:
        'API documentation for Educational Consultancy Management CRM',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Lead: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            studentId: {
              type: 'string',
              format: 'uuid',
            },
            officeId: {
              type: 'string',
              format: 'uuid',
            },
            assignedConsultant: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['new', 'in_progress', 'converted', 'lost'],
              example: 'new',
            },
            source: {
              type: 'string',
              enum: ['walk_in', 'online', 'referral'],
              example: 'walk_in',
            },
            studyPreferences: {
              type: 'object',
              properties: {
                destination: { type: 'string', example: 'Canada' },
                level: { type: 'string', example: 'Undergraduate' },
                budget: { type: 'number', example: 20000 },
                fields: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Computer Science'],
                },
              },
            },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  note: { type: 'string', example: 'Lead registered' },
                  timestamp: { type: 'string', format: 'date-time' },
                  userId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            studentId: {
              type: 'string',
              format: 'uuid',
            },
            consultantId: {
              type: 'string',
              format: 'uuid',
            },
            officeId: {
              type: 'string',
              format: 'uuid',
            },
            dateTime: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-10T14:00:00Z',
            },
            type: {
              type: 'string',
              enum: ['in_person', 'virtual'],
              example: 'virtual',
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'completed', 'canceled', 'no_show'],
              example: 'scheduled',
            },
            notes: {
              type: 'string',
              example: 'Initial consultation',
            },
          },
        },
        Document: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            type: {
              type: 'string',
              enum: [
                'passport',
                'cnic',
                'transcript',
                'test_score',
                'degree',
                'experience_letter',
                'bank_statement',
                'photo',
                'other',
              ],
              example: 'transcript',
            },
            filePath: {
              type: 'string',
              example: '/uploads/documents/transcript.pdf',
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              example: 'pending',
            },
            expiryDate: {
              type: 'string',
              format: 'date-time',
              example: '2026-06-07T12:00:00Z',
            },
            notes: {
              type: 'string',
              example: 'Awaiting verification',
            },
          },
        },
        StudentProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            personalInfo: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'John Doe' },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'john.doe@example.com',
                },
                phone: { type: 'string', example: '+1234567890' },
                dob: { type: 'string', format: 'date', example: '2000-01-01' },
                gender: { type: 'string', example: 'Male' },
                nationality: { type: 'string', example: 'USA' },
              },
            },
            educationalBackground: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  institution: { type: 'string', example: 'XYZ High School' },
                  degree: { type: 'string', example: 'High School Diploma' },
                  year: { type: 'number', example: 2018 },
                },
              },
            },
            studyPreferences: {
              type: 'object',
              properties: {
                destination: { type: 'string', example: 'Canada' },
                level: { type: 'string', example: 'Undergraduate' },
                fields: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Computer Science'],
                },
              },
            },
            additionalInfo: {
              type: 'object',
              properties: {
                checklist: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      task: { type: 'string', example: 'Submit transcript' },
                      status: {
                        type: 'string',
                        enum: ['pending', 'completed'],
                      },
                    },
                  },
                },
                applicationStatus: {
                  type: 'string',
                  example: 'In Progress',
                },
              },
            },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            type: {
              type: 'string',
              enum: ['email', 'sms', 'in_app'],
              example: 'in_app',
            },
            message: {
              type: 'string',
              example: 'Your appointment is scheduled for June 10.',
            },
            status: {
              type: 'string',
              enum: ['sent', 'pending', 'failed'],
              example: 'sent',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-07T12:00:00Z',
            },
            read: {
              type: 'boolean',
              example: false,
            },
          },
        },
        Office: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'Toronto Branch',
            },
            location: {
              type: 'object',
              properties: {
                address: { type: 'string', example: '123 University Ave' },
                city: { type: 'string', example: 'Toronto' },
                country: { type: 'string', example: 'Canada' },
              },
            },
            contactInfo: {
              type: 'object',
              properties: {
                phone: { type: 'string', example: '+1-416-123-4567' },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'toronto@treklin.com',
                },
              },
            },
            managerId: {
              type: 'string',
              format: 'uuid',
              example: '98765432-12d3-4e5f-a678-426614174000',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },
        UserStaff: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'staff@example.com',
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'manager', 'consultant', 'receptionist'],
              example: 'consultant',
            },
            officeId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'Jane Doe',
            },
            phone: {
              type: 'string',
              example: '+1234567890',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
          },
        },
        LeadRule: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            criteria: {
              type: 'object',
              properties: {
                officeId: { type: 'string', format: 'uuid' },
                studyDestination: { type: 'string', example: 'Canada' },
                leadSource: {
                  type: 'string',
                  enum: ['walk_in', 'online', 'referral'],
                  example: 'online',
                },
              },
            },
            priority: {
              type: 'number',
              example: 1,
            },
            targetConsultantIds: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
              },
              example: ['98765432-12d3-4e5f-a678-426614174000'],
            },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            type: {
              type: 'string',
              enum: [
                'office_performance',
                'consultant_productivity',
                'lead_conversion',
                'revenue',
                'student_demographics',
                'study_destinations',
              ],
              example: 'office_performance',
            },
            data: {
              type: 'object',
              example: { totalLeads: 100, conversionRate: 0.25 },
            },
            createdBy: {
              type: 'string',
              format: 'uuid',
              example: '98765432-12d3-4e5f-a678-426614174000',
            },
            format: {
              type: 'string',
              enum: ['pdf', 'excel'],
              example: 'pdf',
            },
            scheduled: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-07T12:00:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-06-07T12:00:00Z',
            },
          },
        },
        StudentProfileInput: {
          type: 'object',
          required: ['personalInfo', 'educationalBackground', 'studyPreferences'],
          properties: {
            personalInfo: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
                phone: { type: 'string', example: '+1234567890' },
                dob: { type: 'string', format: 'date', example: '2000-01-01' },
                gender: { type: 'string', example: 'Male' },
                nationality: { type: 'string', example: 'USA' },
              },
            },
            educationalBackground: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  institution: { type: 'string', example: 'XYZ School' },
                  degree: { type: 'string', example: 'High School Diploma' },
                  year: { type: 'number', example: 2018 },
                },
              },
            },
            studyPreferences: {
              type: 'object',
              properties: {
                destination: { type: 'string', example: 'Canada' },
                level: { type: 'string', example: 'Undergraduate' },
                fields: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Computer Science'],
                },
              },
            },
            testScores: {
              type: 'object',
            },
            workExperience: {
              type: 'object',
            },
            financialInfo: {
              type: 'object',
            },
            additionalInfo: {
              type: 'object',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: [path.join(__dirname, '../routes/*.js')],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
