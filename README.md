# ===== GitHub Push Commands =====

# Initial setup
git init
git add .
git commit -m "feat: Enterprise SMS Billing System

Features:
- Supplier & Client management with rates
- MCC/MNC database for all countries
- SMPP/HTTP channel management (Kannel)
- Real-time bind status monitoring
- SMS logs with filtering & export
- Invoice generation (hourly/daily/weekly/monthly)
- Payment reminders (Monday & Thursday)
- Force DLR configuration
- Reports with analytics"

git remote add origin https://github.com/YOUR_USERNAME/sms-billing-enterprise.git
git branch -M main
git push -u origin main

# ===== Update deployed app =====
ssh user@your-server
cd /var/www/sms-billing-enterprise
git pull origin main
npm install && npm run build
sudo systemctl restart nginx

🚀 Quick Deploy Checklist
1. Push code to GitHub
2. SSH into your Debian server
3. Clone repo to /var/www/
4. Run npm install && npm run build
5. Configure Nginx as reverse proxy
6. Setup SSL with Let's Encrypt
7. Access via your domain!
