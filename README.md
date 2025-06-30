# CRM Backend with Real-time Messaging System

A comprehensive CRM backend system with real-time messaging capabilities using Socket.IO, Express.js, and PostgreSQL.

## 🚀 Features

### Core CRM Features

- **User Management**: Multi-role system (Super Admin, Manager, Consultant, Receptionist, Student)
- **Lead Management**: Lead assignment, tracking, and conversion
- **Office Management**: Multiple office support with role-based access
- **Appointment Scheduling**: Book, reschedule, and manage appointments
- **Document Management**: File upload and document tracking
- **Reporting**: Comprehensive analytics and reporting

### Real-time Messaging Features

- **Instant Messaging**: Real-time text messages with Socket.IO
- **File Sharing**: Upload and share images, videos, documents
- **Conversation Management**: Direct and group conversations
- **Message Status**: Delivery and read receipts
- **Typing Indicators**: Live typing status
- **Online Presence**: User online/offline status
- **Message Search**: Full-text search across conversations
- **Conversation Monitoring**: Admin oversight of conversations
- **Role-based Conversations**: Automatic conversation creation based on assignments

## 📋 Prerequisites

- Node.js (v16.0.0 or higher)
- PostgreSQL (v12 or higher)
- Redis (optional, for caching)
- npm or yarn package manager

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd crm-backend-realtime-messaging
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_messaging_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Server
PORT=5009
FRONTEND_URL=http://localhost:3000
```

### 4. Database Setup

```bash
# Create database
createdb crm_messaging_db

# Run migrations
npm run migrate

# (Optional) Seed sample data
npm run seed
```

### 5. Create Upload Directories

```bash
mkdir -p uploads/messages
mkdir -p uploads/documents
mkdir -p logs
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5009` with the following endpoints:

- API Documentation: `http://localhost:5009/api-docs`
- Health Check: `http://localhost:5009/health`
- Socket Stats: `http://localhost:5009/socket-stats`

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/signup` - Student registration
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/google` - Google OAuth
- `GET /api/v1/auth/facebook` - Facebook OAuth

### Message Endpoints

- `POST /api/v1/messages` - Send message
- `POST /api/v1/messages/upload` - Send message with file
- `PUT /api/v1/messages/:id` - Edit message
- `DELETE /api/v1/messages/:id` - Delete message
- `PATCH /api/v1/messages/:id/read` - Mark message as read
- `GET /api/v1/messages/search` - Search messages

### Conversation Endpoints

- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations` - Get user conversations
- `GET /api/v1/conversations/:id` - Get conversation details
- `GET /api/v1/conversations/:id/messages` - Get conversation messages
- `POST /api/v1/conversations/:id/participants` - Add participants
- `PATCH /api/v1/conversations/:id/read` - Mark conversation as read

### Monitoring Endpoints (Admin/Manager)

- `GET /api/v1/conversations/monitoring/office/:officeId` - Monitor office conversations
- `GET /api/v1/conversations/monitoring/all` - Monitor all conversations (Super Admin)

## 🔌 Socket.IO Events

### Client to Server Events

```javascript
// Connection
socket.emit('join_conversation', { conversationId });
socket.emit('leave_conversation', { conversationId });

// Messaging
socket.emit('send_message', { conversationId, content, type, replyToId });
socket.emit('edit_message', { messageId, content });
socket.emit('delete_message', { messageId });
socket.emit('mark_message_read', { messageId });

// Presence
socket.emit('typing_start', { conversationId });
socket.emit('typing_stop', { conversationId });
socket.emit('update_presence', {
  presence: 'online' | 'away' | 'busy' | 'offline',
});

// File Upload
socket.emit('file_upload_start', { conversationId, fileName, fileSize });
socket.emit('file_upload_progress', { uploadId, progress });
socket.emit('file_upload_complete', { uploadId, fileUrl });
```

### Server to Client Events

```javascript
// Messages
socket.on('message_received', (data) => {
  /* New message */
});
socket.on('message_edited', (data) => {
  /* Message edited */
});
socket.on('message_deleted', (data) => {
  /* Message deleted */
});
socket.on('message_read', (data) => {
  /* Message read receipt */
});

// Conversations
socket.on('conversation_created', (data) => {
  /* New conversation */
});
socket.on('conversation_updated', (data) => {
  /* Conversation updated */
});
socket.on('user_joined_conversation', (data) => {
  /* User joined */
});
socket.on('user_left_conversation', (data) => {
  /* User left */
});

// Presence
socket.on('user_typing_start', (data) => {
  /* User started typing */
});
socket.on('user_typing_stop', (data) => {
  /* User stopped typing */
});
socket.on('user_status_changed', (data) => {
  /* User online/offline */
});

// System
socket.on('system_announcement', (data) => {
  /* System announcement */
});
socket.on('notification_received', (data) => {
  /* New notification */
});
```

## 🔐 Authentication

The system uses JWT (JSON Web Tokens) for authentication:

1. **Login**: Send credentials to `/api/v1/auth/login`
2. **Token**: Receive JWT token in response
3. **Headers**: Include token in `Authorization: Bearer <token>` header
4. **Socket**: Send token in socket handshake auth object

### Role-based Access Control

- **Super Admin**: Full system access, can monitor all conversations
- **Manager**: Office management, can monitor office conversations
- **Consultant**: Lead management, student conversations
- **Receptionist**: Appointment management, office communication
- **Student**: Profile management, consultant communication

## 💬 Conversation Types

### Automatic Conversation Creation

The system automatically creates conversations based on user assignments:

1. **Lead-Consultant**: When a lead is assigned to a consultant
2. **Manager-Consultant**: For office management communication
3. **Manager-Receptionist**: For office coordination
4. **Manager-Lead**: For direct manager intervention

### Manual Conversation Creation

Users can create conversations based on their permissions:

- General group conversations
- Support conversations
- Project-specific discussions

## 📁 File Upload System

### Supported File Types

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, MPEG, QuickTime, WebM
- **Documents**: PDF, Word, Excel, PowerPoint, Text, CSV
- **Archives**: ZIP, RAR, 7Z

### File Constraints

- Maximum file size: 50MB
- Maximum files per message: 10
- Automatic file type detection
- Virus scanning (configurable)

### Storage Options

- **Local Storage**: Files stored in `uploads/` directory
- **Cloud Storage**: AWS S3 integration with CloudFront CDN
- **File Metadata**: Stored in database with message references

## 🔍 Search System

### Message Search Features

- **Full-text search**: PostgreSQL GIN indexes
- **Filter by**: Date range, message type, conversation
- **Advanced search**: Sender, file type, content matching
- **Real-time results**: Instant search as you type

### Search API

```javascript
GET /api/v1/messages/search?q=search_term&conversationId=123&type=image
```

## 📊 Monitoring & Analytics

### Conversation Monitoring

- **Manager Level**: Monitor all conversations in their office
- **Super Admin Level**: Monitor all conversations system-wide
- **Real-time Viewing**: Live message monitoring
- **Export Capabilities**: Download conversation history

### System Analytics

- **Socket Statistics**: Connected users, active conversations
- **Message Metrics**: Volume, types, response times
- **User Activity**: Online presence, message frequency
- **Performance Monitoring**: Response times, error rates

## 🛡️ Security Features

### Message Security

- **Input Validation**: All message content validated
- **Rate Limiting**: Prevent message spam
- **Content Moderation**: Basic profanity filtering
- **Permission Checks**: Role-based message access

### Socket Security

- **Authentication**: JWT verification for socket connections
- **CORS Protection**: Configured allowed origins
- **Rate Limiting**: Per-user connection and event limits
- **Connection Monitoring**: Track and limit concurrent connections

### File Security

- **Type Validation**: Strict file type checking
- **Size Limits**: Configurable upload size limits
- **Malware Scanning**: Integration ready for virus scanning
- **Access Control**: File access based on conversation membership

## 🔧 Configuration

### Environment Variables

Key configuration options:

```env
# Message Configuration
MESSAGE_MAX_LENGTH=10000
MESSAGE_EDIT_TIME_LIMIT=900000
MESSAGE_SEARCH_ENABLED=true

# Conversation Configuration
MAX_CONVERSATION_PARTICIPANTS=50
AUTO_CREATE_CONVERSATIONS=true

# Socket Configuration
SOCKET_MAX_CONNECTIONS_PER_USER=5
SOCKET_PING_TIMEOUT=60000

# File Upload Configuration
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,video/mp4

# Security Configuration
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Categories

- **Unit Tests**: Service and utility functions
- **Integration Tests**: API endpoints and database operations
- **Socket Tests**: Real-time functionality testing
- **Authentication Tests**: JWT and OAuth verification

## 📦 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up Redis for session storage
- [ ] Configure cloud file storage
- [ ] Set up SSL/TLS certificates
- [ ] Configure monitoring and logging
- [ ] Set up backup strategies
- [ ] Configure CDN for file delivery

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5009
CMD ["npm", "start"]
```

### Database Migrations in Production

```bash
# Run migrations
npm run migrate

# Rollback if needed
npm run migrate:undo
```

## 🐛 Troubleshooting

### Common Issues

1. **Socket Connection Failed**

   - Check CORS configuration
   - Verify JWT token validity
   - Confirm server is running

2. **File Upload Errors**

   - Check file size limits
   - Verify upload directory permissions
   - Confirm file type is allowed

3. **Database Connection Issues**

   - Verify PostgreSQL is running
   - Check database credentials
   - Confirm database exists

4. **Message Not Delivered**
   - Check user is in conversation
   - Verify socket connection
   - Check conversation permissions

### Debug Mode

Enable debug logging:

```env
DEBUG_SQL=true
DEBUG_SOCKET=true
LOG_LEVEL=debug
```

## 📈 Performance Optimization

### Database Optimization

- Proper indexing on conversation and message tables
- Connection pooling configuration
- Query optimization for message loading

### Socket.IO Optimization

- Room-based message distribution
- Connection cleanup and management
- Event throttling and debouncing

### File Handling Optimization

- CDN integration for file delivery
- Image optimization and compression
- Lazy loading for large files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Check the API documentation at `/api-docs`
- Review the troubleshooting section
- Check server health at `/health`
- Monitor socket statistics at `/socket-stats`

## 🔄 Updates and Migrations

### Database Migrations

```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-feature

# Run pending migrations
npm run migrate

# Check migration status
npx sequelize-cli db:migrate:status
```

### Version Updates

Check `CHANGELOG.md` for version-specific updates and breaking changes.

---

## 🎯 Next Steps

Now that the backend is ready, you can:

1. Start the server with `npm run dev`
2. Test the API endpoints using the Swagger documentation
3. Connect your frontend application
4. Set up real-time messaging in your React components
5. Configure monitoring and analytics

Happy coding! 🚀
