# Python Code Analyzer Frontend

A modern React application built with TypeScript, Vite, and Material-UI for visualizing Python project structures.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run type-check
```

## 📁 Project Structure

```
src/
├── app/                    # App-level configuration and main App component
├── features/               # Feature-based organization
│   ├── analysis/          # Project analysis features
│   ├── visualization/     # Data visualization components
│   ├── exploration/       # Code exploration features
│   └── search/            # Search and filtering features
├── shared/                # Shared utilities, types, and components
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── styles/           # Global styles
└── test/                  # Test configuration and utilities
```

## 🛠 Technology Stack

- **React 18.3+** - UI framework with concurrent features
- **TypeScript 5.3+** - Type safety and enhanced developer experience
- **Vite** - Fast build tool and development server
- **Material-UI v6** - Modern component library with Material Design 3
- **Emotion** - CSS-in-JS styling solution
- **Vitest** - Fast unit testing framework
- **ESLint** - Code linting and formatting

## 🎯 Features

- **Modern Build System**: Vite for fast development and optimized builds
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Feature-Based Architecture**: Organized by features for better maintainability
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Accessibility**: WCAG 2.1 AA compliance and keyboard navigation
- **Responsive Design**: Mobile-first approach with adaptive layouts

## 📝 Development Guidelines

### Code Organization

- Use feature-based organization for better scalability
- Keep components small and focused on single responsibilities
- Use TypeScript interfaces for all props and data structures
- Implement proper error boundaries and loading states

### Styling

- Use Material-UI's sx prop for component-specific styles
- Leverage CSS custom properties for theming
- Follow responsive design principles
- Ensure accessibility compliance

### Performance

- Implement code splitting for route-based and component-based loading
- Use React.memo and useMemo for expensive operations
- Monitor bundle sizes and optimize imports
- Implement virtualization for large datasets

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run type-check
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `VITE_API_BASE_URL` - Backend API URL
- `VITE_DEV_MODE` - Enable development features
- `VITE_ENABLE_PERFORMANCE_MONITORING` - Performance tracking

### Path Aliases

The following path aliases are configured:

- `@/` - src directory
- `@app/` - app directory
- `@features/` - features directory
- `@shared/` - shared directory
- `@components/` - components directory
- `@design-system/` - design system directory

## 📦 Build and Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

The build output will be in the `dist/` directory, optimized for production deployment.

## 🤝 Contributing

1. Follow the established project structure
2. Write TypeScript with strict type checking
3. Include tests for new features
4. Ensure accessibility compliance
5. Follow the existing code style and conventions
