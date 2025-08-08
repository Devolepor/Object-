// القيم مشفرة بـ Base64
const GITHUB_TOKEN = atob("Z2hwXzQzN21PVGlVdUdPaG9uOFE1S2szOVRyRkJjZklDaDBhWkN6ZA==");
const REPO_OWNER = atob("RGV2b2xlcG9y");
const REPO_NAME = atob("T2JqZWN0LQ==");
const FILE_PATH = atob("ZGF0YS5qc29u");

// استخدام القيم
console.log(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH);


// دلوقتي ممكن تستخدمهم عادي
console.log(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH);

        
        // عرض معاينة الصورة
        document.getElementById('imageUpload').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('previewImage');
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                    document.querySelector('.upload-icon').style.display = 'none';
                }
                reader.readAsDataURL(file);
            }
        });
        
        // الانتقال للخطوة التالية
        function nextStep() {
            // التحقق من صحة البيانات
            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!fullName || !phone || !password || !confirmPassword) {
                showError('الرجاء ملء جميع الحقول المطلوبة');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('كلمة المرور غير متطابقة');
                return;
            }
            
            if (phone.length < 10 || !/^\d+$/.test(phone)) {
                showError('رقم الهاتف غير صحيح');
                return;
            }
            
            // حفظ البيانات
            userData = {
                fullName: fullName,
                phone: phone,
                email: document.getElementById('email').value,
                password: password,
                createdAt: new Date().toISOString()
            };
            
            // تغيير الخطوة
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step2').classList.add('active');
        }
        
        // العودة للخطوة السابقة
        function prevStep() {
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.add('active');
        }
        
        // إرسال النموذج
        async function submitForm() {
            const governorate = document.getElementById('governorate').value;
            const birthDate = document.getElementById('birthDate').value;
            const imageUpload = document.getElementById('imageUpload').files[0];
            
            if (!governorate || !birthDate) {
                showError('الرجاء ملء جميع الحقول المطلوبة');
                return;
            }
            
            // إضافة البيانات المتبقية
            userData.governorate = governorate;
            userData.birthDate = birthDate;
            
            // تحويل الصورة إلى base64 إذا تم رفعها
            if (imageUpload) {
                const base64Image = await toBase64(imageUpload);
                userData.image = base64Image;
            }
            
            try {
                // جلب البيانات الحالية من GitHub
                const currentData = await getCurrentData();
                
                // إضافة المستخدم الجديد
                currentData.users.push(userData);
                
                // تحديث الملف على GitHub
                await updateDataOnGitHub(currentData);
                
                // عرض نافذة النجاح
                document.getElementById('successPopup').classList.add('active');
                
                // التحويل إلى الصفحة الرئيسية بعد 3 ثواني
                setTimeout(() => {
                    window.location.href = "home.html";
                }, 3000);
            } catch (error) {
                console.error('Error:', error);
                showError('حدث خطأ أثناء حفظ البيانات: ' + error.message);
            }
        }
        
        // دالة لتحويل الصورة إلى base64
        function toBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }
        
        // جلب البيانات الحالية من GitHub
        async function getCurrentData() {
            try {
                const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!response.ok) {
                    // إذا لم يوجد الملف، نعيد هيكل بيانات فارغ
                    if (response.status === 404) {
                        return { users: [] };
                    }
                    throw new Error('فشل في جلب البيانات الحالية');
                }
                
                const data = await response.json();
                const content = atob(data.content.replace(/\s/g, ''));
                return JSON.parse(content);
            } catch (error) {
                console.error('Error getting current data:', error);
                return { users: [] };
            }
        }
        
        // تحديث البيانات على GitHub
        async function updateDataOnGitHub(newData) {
            const content = JSON.stringify(newData, null, 2);
            const contentEncoded = btoa(unescape(encodeURIComponent(content)));
            
            // نحتاج أولاً إلى جلب SHA للملف الحالي إذا كان موجوداً
            let sha = null;
            try {
                const currentFile = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (currentFile.ok) {
                    const fileData = await currentFile.json();
                    sha = fileData.sha;
                }
            } catch (error) {
                console.error('Error getting file SHA:', error);
            }
            
            // إنشاء أو تحديث الملف
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Update user data',
                    content: contentEncoded,
                    sha: sha
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'فشل في تحديث البيانات');
            }
            
            return await response.json();
        }
        
        // عرض رسالة خطأ
        function showError(message) {
            document.getElementById('errorMessage').textContent = message;
            document.getElementById('errorPopup').classList.add('active');
        }
