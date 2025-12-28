# Contributing to TrueVibe

First off, thank you for considering contributing to TrueVibe! 🎉

TrueVibe is an open-source project, and we love to receive contributions from our community. There are many ways to contribute, from writing tutorials, improving documentation, submitting bug reports, and writing code.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **MongoDB** 7.x or higher
- **Git** for version control
- **Python** 3.10+ (optional, for AI services)

### Fork & Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/TrueVibe.git
   cd TrueVibe
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/baigcoder/TrueVibe.git
   ```

## 💻 Development Setup

### Frontend Setup

```bash
# Install dependencies
npm install

# Copy environment example
cp .env.example .env

# Start development server
npm run dev
```

### Backend Setup

```bash
cd server

# Install dependencies
npm install

# Copy environment example
cp .env.example .env

# Start development server
npm run dev
```

### Running Tests

```bash
# Frontend tests
npm run test

# Backend tests
cd server && npm run test

# Type checking
npm run typecheck
```

## ✨ Making Changes

### Branch Naming Convention

Use descriptive branch names:

- `feature/add-user-profile` - New features
- `fix/login-validation` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/clean-api-routes` - Code refactoring
- `hotfix/critical-security-patch` - Critical fixes

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): add OAuth2 Google login
fix(chat): resolve message duplication issue
docs(readme): update installation instructions
```

## 📝 Pull Request Process

1. **Update your fork** with the latest upstream changes:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit following our conventions

4. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots for UI changes
   - Link to related issues

6. **Address review feedback** and update your PR

7. **Celebrate** when merged! 🎉

## 🎨 Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer `const` over `let`
- Use async/await over callbacks
- Add JSDoc comments for public APIs

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use CSS Modules for styling
- Follow the existing component structure

### CSS

- Use CSS Modules (`.module.css`)
- Follow BEM-like naming in modules
- Use CSS variables for theming
- Mobile-first responsive design

### File Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── context/        # React contexts
├── api/            # API client and types
├── lib/            # Utility functions
└── routes/         # TanStack Router definitions
```

## 🔍 Code Review

All submissions require review. We use GitHub pull requests for this purpose. Here's what reviewers look for:

- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] TypeScript has no errors
- [ ] Documentation is updated
- [ ] No sensitive data exposed
- [ ] Accessibility considered

## 🐛 Reporting Bugs

When filing an issue, please include:

1. **Summary** - Clear description of the bug
2. **Steps to Reproduce** - How to trigger the issue
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - Browser, OS, Node version
6. **Screenshots** - If applicable

## 💡 Suggesting Features

We love feature ideas! Please create an issue with:

1. **Problem Statement** - What problem does this solve?
2. **Proposed Solution** - How would it work?
3. **Alternatives Considered** - Other approaches
4. **Additional Context** - Mockups, examples

## 🏷️ Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `feature` | New feature request |
| `docs` | Documentation improvements |
| `good first issue` | Great for newcomers |
| `help wanted` | Extra attention needed |
| `priority: high` | Critical issues |

## 🤝 Community

- **GitHub Discussions** - Ask questions, share ideas
- **Issues** - Report bugs, request features
- **Pull Requests** - Contribute code

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

<div align="center">

**Thank you for contributing to TrueVibe! 💜**

</div>
