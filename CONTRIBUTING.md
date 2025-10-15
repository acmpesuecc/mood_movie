# Contributing to MoodMatcher

- Welcome to Hacknight 7.0!
- Thank you for your interest in contributing to MoodMatcher :D
- This guide will help you contribute confidently, especially if you're new to open source.

---

## Before You Begin

- Please read the [README.md](./README.md) to understand the project's purpose, setup instructions, and goals.
- Ensure you're working on the latest `main` branch before starting any work.

---

## Contribution Guidelines

Please follow these to ensure smooth collaboration and maintain quality.

### DOs

- Ask to be assigned before starting work.
- Mention the issue number in your PR (`Fixes #<number>` or `Closes #<number>`).
- Test your changes locally before submitting a PR.
- Keep PRs focused — one feature or fix per PR.
- Submit **one pull request per issue** to keep the review process clean and focused.
- Use screenshots for any visual/UI updates.

### DON’Ts

- Don’t open PRs **without linking them to an issue**.  
- Don’t spam with duplicate or irrelevant issues.

---
## Project Structure

```bash
mood_movie/
├── node_modules/                 
│
├── public/                       
│   ├── firebaseconfig.js         
│   ├── index.html                
│   ├── script.js                 
│   └── styles.css                
│
├── server/                       
│   └── server.js                 
│
├── .env                          
├── .env.example                  
├── .gitignore                    
├── CONTRIBUTING.md               
├── package-lock.json             
├── package.json                  
└──README.md                     
```           


## Steps to make a PR

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
git clone https://github.com/acmpesuecc/mood_movie
cd mood_movie
```

### 2. Important: Create a new Branch, do not commit to main. 

```bash
git checkout -b "branchname"
```

### 3. Make Your Changes

* Fix the assigned issue

### 4. Test Your Changes

* Check responsiveness on different screen sizes
* Verify that your changes don’t break any existing functionality
* Review in both light and dark mode 

### 5. Commit Your Changes

```bash
git commit -m "meaningful commit message"
```

### 6. Push to Your Fork

```bash
git push origin branchname
```

### 7. Open a Pull Request

* Open a PR from your branch to the `main` branch
* Mention the issue like this:

```md
Fixes #issue-number
```

* Provide a short summary of your changes
* Add before/after screenshots if the UI was affected
* Mark the PR as **“Ready for Review”**

---


### Commit Messages

Use clear, descriptive messages. Example:

```bash
fix: resolved button alignment issue (#34)
feat: fixed chart ui (#18)
docs: updated README with project setup instructions
```

### Pull Requests
* Reference the relevant issue. Link the issue using :
  
  ```bash
  Fixes #34
  Resolves #12
  ```
  
* Keep PRs focused and minimal
* For UI changes, include before/after screenshots and ensure it works in both light and dark mode.
* Only work on assigned issues, and reference the issue in your PR (e.g., Fixes #10).



## Code Style Guide

* Follow consistent indentation and formatting
* Keep all custom styles in `styles/style.css`
* Reuse components where possible
* Use comments for clarity where needed

---

## Testing Your Changes

Make sure your updates:

* Work as expected without breaking other features
* Are responsive across screen sizes
* Include test cases, if applicable

---


## Credits

- Made with ❤️ by **Sarah Kazi**
- Open to feedback, contributions, and suggestions! 
