# Commit Message Instructions

## Format
Use [Conventional Commits](https://www.conventionalcommits.org/) with the following format:

```
<type>(scope): <short description>

<detailed description>
```

## Type
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI/CD configuration changes
- `chore`: Other changes that don't modify src or test files

## Scope
**REQUIRED** - Use the package name:
- `web` - Changes in apps/web
- `config` - Changes in packages/config
- `root` - Changes in root-level files (turbo.json, pnpm-workspace.yaml, etc.)

## Title (First Line)
- **Keep it short** (50 characters or less)
- Use imperative mood ("add feature" not "added feature")
- Don't end with a period
- Lowercase after the colon

## Description (Body)
- **Add details here** - explain what and why, not how
- Wrap at 72 characters
- Use bullet points for multiple changes
- Reference issues if applicable

## Examples

### Feature
```
feat(web): add Urbanist variable font support

- Configure @font-face declarations for Urbanist variable font
- Update theme tokens to use Urbanist for body and heading
- Import fonts.css in main styles
```

### Fix
```
fix(web): correct gray scale token values

Replace inconsistent shade colors with normalized gray scale from dark palette.
Tokens now progress logically from lightest (50) to darkest (950).
```

### Style
```
style(web): update Chakra UI theme token formatting

Remove descriptions from tokens per formatter settings.
```

### Refactor
```
refactor(config): simplify ESLint configuration

Extract common rules to shared config for reuse across packages.
```

### Docs
```
docs(root): update copilot instructions with Chakra UI v3 specifics

Add details about theme system, token reference syntax, and typegen command.
```

### Build
```
build(root): upgrade pnpm to 10.28.0

Update packageManager field and regenerate lockfile.
```
