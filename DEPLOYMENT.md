# Deployment Guide - Big Drip Kicks

This guide will help you deploy your Big Drip Kicks inventory management system to GitHub and Vercel.

## 🚀 Step 1: Prepare Your Project

### 1.1 Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Big Drip Kicks Inventory System"
```

### 1.2 Create GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `big-drip-kicks` or your preferred name
3. Make it public or private (your choice)
4. **Don't** initialize with README, .gitignore, or license (we already have these)

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/yourusername/big-drip-kicks.git
git branch -M main
git push -u origin main
```

## 🚀 Step 2: Set Up Supabase

### 2.1 Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Choose your organization and region
3. Wait for the project to be created

### 2.2 Get Your Credentials
1. Go to Settings → API in your Supabase dashboard
2. Copy your Project URL and anon/public key
3. Keep these safe - you'll need them for Vercel

### 2.3 Set Up Database
1. Go to SQL Editor in your Supabase dashboard
2. Run the migrations from `supabase/migrations/` in order:
   - `20250815020000_fix_quick_sale.sql`
   - `20250815020001_quick_sale_triggers.sql`
   - Any other migration files you have

## 🚀 Step 3: Deploy to Vercel

### 3.1 Connect to Vercel
1. Go to [Vercel](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a Vite project

### 3.2 Configure Environment Variables
In your Vercel project settings, add these environment variables:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3.3 Deploy
1. Click "Deploy"
2. Vercel will build and deploy your project
3. You'll get a URL like `https://your-project.vercel.app`

## 🚀 Step 4: Test Your Deployment

### 4.1 Verify the App Works
1. Visit your Vercel URL
2. Test the login functionality
3. Verify all features work correctly

### 4.2 Set Up Custom Domain (Optional)
1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Configure DNS settings as instructed

## 🔧 Troubleshooting

### Common Issues

**Build Fails:**
- Check that all dependencies are in `package.json`
- Verify environment variables are set correctly
- Check the build logs in Vercel dashboard

**Authentication Issues:**
- Verify Supabase URL and key are correct
- Check that RLS policies are set up properly
- Ensure user profiles exist in the database

**Database Connection Issues:**
- Verify Supabase project is active
- Check that migrations ran successfully
- Ensure RLS policies allow proper access

### Environment Variables Checklist

Make sure these are set in Vercel:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

## 📱 Post-Deployment

### 4.1 Set Up Monitoring
- Enable Vercel Analytics
- Set up error tracking if needed
- Monitor performance metrics

### 4.2 Security Considerations
- Keep your Supabase keys secure
- Regularly update dependencies
- Monitor for security vulnerabilities

### 4.3 Backup Strategy
- Set up database backups in Supabase
- Consider version control for database schema
- Keep local backups of important data

## 🎉 Success!

Your Big Drip Kicks inventory system is now live! 

**Next Steps:**
1. Test all features thoroughly
2. Set up user accounts for your team
3. Import your product inventory
4. Start using the system for daily operations

---

**Need Help?** Create an issue on GitHub or contact support.
