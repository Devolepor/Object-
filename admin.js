  // GitHub API Configuration
        const GITHUB_TOKEN = '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';
        const REPO_OWNER = 'Devolepor';
        const REPO_NAME = 'Object-';
        const FILE_PATH = 'doc.json';
        const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

        // Global variables
        let doctorsData = [];
        let currentEditId = null;
        let pendingChanges = false;

        // DOM Elements
        const doctorForm = document.getElementById('doctor-form');
        const doctorsTbody = document.getElementById('doctors-tbody');
        const loadingElement = document.getElementById('loading');
        const refreshBtn = document.getElementById('refresh-btn');
        const saveAllBtn = document.getElementById('save-all-btn');
        const addScheduleBtn = document.getElementById('add-schedule');
        const cancelBtn = document.getElementById('cancel-btn');
        const submitBtn = document.getElementById('submit-btn');
        const alertContainer = document.getElementById('alert-container');
        const confirmModal = document.getElementById('confirm-modal');
        const closeModalBtn = document.querySelector('.close-modal');
        const confirmCancelBtn = document.getElementById('confirm-cancel');
        const confirmActionBtn = document.getElementById('confirm-action');

        // Initialize the application
        document.addEventListener('DOMContentLoaded', () => {
            loadDoctorsData();
            setupEventListeners();
        });

        // Set up event listeners
        function setupEventListeners() {
            // Form submission
            doctorForm.addEventListener('submit', handleFormSubmit);
            
            // Refresh button
            refreshBtn.addEventListener('click', loadDoctorsData);
            
            // Save all button
            saveAllBtn.addEventListener('click', saveAllChanges);
            
            // Add schedule day button
            addScheduleBtn.addEventListener('click', addScheduleDay);
            
            // Cancel edit button
            cancelBtn.addEventListener('click', cancelEdit);
            
            // Modal buttons
            closeModalBtn.addEventListener('click', () => confirmModal.style.display = 'none');
            confirmCancelBtn.addEventListener('click', () => confirmModal.style.display = 'none');
            window.addEventListener('click', (e) => {
                if (e.target === confirmModal) {
                    confirmModal.style.display = 'none';
                }
            });
        }

        // Load doctors data from GitHub
        async function loadDoctorsData() {
            try {
                showLoading();
                const response = await fetch(API_URL, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch data from GitHub');
                }
                
                const data = await response.json();
                const content = atob(data.content);
                doctorsData = JSON.parse(content).doctors;
                
                renderDoctorsTable();
                hideLoading();
                showAlert('تم تحميل بيانات الأطباء بنجاح', 'success');
                pendingChanges = false;
                saveAllBtn.disabled = true;
            } catch (error) {
                hideLoading();
                showAlert(`حدث خطأ أثناء تحميل البيانات: ${error.message}`, 'danger');
                console.error('Error loading doctors data:', error);
            }
        }

        // Render doctors table
        function renderDoctorsTable() {
            doctorsTbody.innerHTML = '';
            
            if (doctorsData.length === 0) {
                doctorsTbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">لا توجد بيانات متاحة</td></tr>';
                return;
            }
            
            doctorsData.forEach(doctor => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><img src="${doctor.image}" alt="${doctor.name}" class="doctor-image"></td>
                    <td>${doctor.name}</td>
                    <td>${doctor.specialty}</td>
                    <td>${doctor.governorate}</td>
                    <td>${doctor.price} ج.م</td>
                    <td>
                        <span class="badge ${getRatingBadgeClass(doctor.rating)}">
                            ${doctor.rating} (${doctor.reviews} تقييم)
                        </span>
                    </td>
                    <td>
                        <div class="schedule-days">
                            ${Object.entries(doctor.schedule).map(([day, time]) => 
                                `<span class="schedule-day">${day}: ${time.from} - ${time.to}</span>`
                            ).join('')}
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-primary edit-btn" data-id="${doctor.id}">
                                <i class="fas fa-edit"></i> تعديل
                            </button>
                            <button class="btn btn-danger delete-btn" data-id="${doctor.id}">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        </div>
                    </td>
                `;
                
                doctorsTbody.appendChild(row);
            });
            
            // Add event listeners to edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => editDoctor(parseInt(btn.dataset.id)));
            });
            
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => showDeleteConfirmation(parseInt(btn.dataset.id)));
            });
        }

        // Handle form submission
        async function handleFormSubmit(e) {
            e.preventDefault();
            
            const doctorData = getFormData();
            
            try {
                if (currentEditId === null) {
                    // Add new doctor
                    doctorData.id = generateNewId();
                    doctorsData.push(doctorData);
                    showAlert('تم إضافة الطبيب بنجاح', 'success');
                } else {
                    // Update existing doctor
                    const index = doctorsData.findIndex(d => d.id === currentEditId);
                    if (index !== -1) {
                        doctorsData[index] = doctorData;
                        showAlert('تم تحديث بيانات الطبيب بنجاح', 'success');
                    }
                    cancelEdit();
                }
                
                renderDoctorsTable();
                doctorForm.reset();
                pendingChanges = true;
                saveAllBtn.disabled = false;
                
                // Scroll to top to see the alert
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                showAlert(`حدث خطأ أثناء حفظ البيانات: ${error.message}`, 'danger');
                console.error('Error saving doctor data:', error);
            }
        }

        // Get form data
        function getFormData() {
            const schedule = {};
            
            document.querySelectorAll('.schedule-day-item').forEach(item => {
                const day = item.querySelector('.schedule-day').value;
                const from = item.querySelector('.schedule-from').value;
                const to = item.querySelector('.schedule-to').value;
                
                schedule[day] = {
                    available: true,
                    from: formatTime(from),
                    to: formatTime(to)
                };
            });
            
            return {
                id: parseInt(document.getElementById('doctor-id').value) || generateNewId(),
                name: document.getElementById('doctor-name').value,
                specialty: document.getElementById('doctor-specialty').value,
                phone: document.getElementById('doctor-phone').value,
                governorate: document.getElementById('doctor-governorate').value,
                location: document.getElementById('doctor-location').value,
                schedule: schedule,
                image: document.getElementById('doctor-image').value,
                mapLink: document.getElementById('doctor-map-link').value,
                latitude: parseFloat(document.getElementById('doctor-latitude').value),
                longitude: parseFloat(document.getElementById('doctor-longitude').value),
                price: parseInt(document.getElementById('doctor-price').value),
                rating: parseFloat(document.getElementById('doctor-rating').value),
                reviews: parseInt(document.getElementById('doctor-reviews').value),
                description: document.getElementById('doctor-description').value
            };
        }

        // Edit doctor
        function editDoctor(id) {
            const doctor = doctorsData.find(d => d.id === id);
            if (!doctor) return;
            
            currentEditId = id;
            
            // Fill the form with doctor data
            document.getElementById('doctor-id').value = doctor.id;
            document.getElementById('doctor-name').value = doctor.name;
            document.getElementById('doctor-specialty').value = doctor.specialty;
            document.getElementById('doctor-phone').value = doctor.phone;
            document.getElementById('doctor-governorate').value = doctor.governorate;
            document.getElementById('doctor-location').value = doctor.location;
            document.getElementById('doctor-image').value = doctor.image;
            document.getElementById('doctor-map-link').value = doctor.mapLink;
            document.getElementById('doctor-latitude').value = doctor.latitude;
            document.getElementById('doctor-longitude').value = doctor.longitude;
            document.getElementById('doctor-price').value = doctor.price;
            document.getElementById('doctor-rating').value = doctor.rating;
            document.getElementById('doctor-reviews').value = doctor.reviews;
            document.getElementById('doctor-description').value = doctor.description;
            
            // Clear and rebuild schedule
            const scheduleContainer = document.getElementById('schedule-container');
            scheduleContainer.innerHTML = '';
            
            Object.entries(doctor.schedule).forEach(([day, time]) => {
                addScheduleDay(day, time.from, time.to);
            });
            
            // Change button text
            submitBtn.innerHTML = '<i class="fas fa-save"></i> تحديث الطبيب';
            cancelBtn.classList.remove('hidden');
            
            // Scroll to form
            document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth' });
        }

        // Cancel edit
        function cancelEdit() {
            currentEditId = null;
            doctorForm.reset();
            document.getElementById('schedule-container').innerHTML = '';
            addScheduleDay(); // Add one empty schedule day
            
            submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الطبيب';
            cancelBtn.classList.add('hidden');
        }

        // Add schedule day
        function addScheduleDay(day = '', from = '', to = '') {
            const scheduleContainer = document.getElementById('schedule-container');
            const dayItem = document.createElement('div');
            dayItem.className = 'schedule-day-item';
            dayItem.innerHTML = `
                <div class="form-group">
                    <label>اليوم</label>
                    <select class="form-control schedule-day" required>
                        <option value="">اختر اليوم</option>
                        <option value="الأحد" ${day === 'الأحد' ? 'selected' : ''}>الأحد</option>
                        <option value="الإثنين" ${day === 'الإثنين' ? 'selected' : ''}>الإثنين</option>
                        <option value="الثلاثاء" ${day === 'الثلاثاء' ? 'selected' : ''}>الثلاثاء</option>
                        <option value="الأربعاء" ${day === 'الأربعاء' ? 'selected' : ''}>الأربعاء</option>
                        <option value="الخميس" ${day === 'الخميس' ? 'selected' : ''}>الخميس</option>
                        <option value="الجمعة" ${day === 'الجمعة' ? 'selected' : ''}>الجمعة</option>
                        <option value="السبت" ${day === 'السبت' ? 'selected' : ''}>السبت</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>من</label>
                    <input type="time" class="form-control schedule-from" value="${from}" required>
                </div>
                <div class="form-group">
                    <label>إلى</label>
                    <input type="time" class="form-control schedule-to" value="${to}" required>
                </div>
                <button type="button" class="btn btn-danger remove-schedule" style="margin-top: 25px;">
                    <i class="fas fa-trash"></i> حذف
                </button>
            `;
            
            scheduleContainer.appendChild(dayItem);
            
            // Add event listener to remove button
            dayItem.querySelector('.remove-schedule').addEventListener('click', () => {
                if (document.querySelectorAll('.schedule-day-item').length > 1) {
                    dayItem.remove();
                } else {
                    showAlert('يجب أن يكون هناك يوم واحد على الأقل', 'warning');
                }
            });
        }

        // Show delete confirmation
        function showDeleteConfirmation(id) {
            const doctor = doctorsData.find(d => d.id === id);
            if (!doctor) return;
            
            document.getElementById('modal-title').textContent = 'تأكيد حذف الطبيب';
            document.getElementById('modal-body').innerHTML = `
                هل أنت متأكد أنك تريد حذف الطبيب <strong>${doctor.name}</strong>؟
                <br>هذا الإجراء لا يمكن التراجع عنه.
            `;
            
            confirmActionBtn.onclick = () => {
                deleteDoctor(id);
                confirmModal.style.display = 'none';
            };
            
            confirmModal.style.display = 'block';
        }

        // Delete doctor
        function deleteDoctor(id) {
            doctorsData = doctorsData.filter(d => d.id !== id);
            renderDoctorsTable();
            showAlert('تم حذف الطبيب بنجاح', 'success');
            pendingChanges = true;
            saveAllBtn.disabled = false;
        }

        // Save all changes to GitHub
        async function saveAllChanges() {
            try {
                showLoading();
                
                // First, get the current file SHA
                const getResponse = await fetch(API_URL, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!getResponse.ok) {
                    throw new Error('Failed to fetch current file data');
                }
                
                const currentFile = await getResponse.json();
                const sha = currentFile.sha;
                
                // Prepare the updated content
                const updatedContent = {
                    doctors: doctorsData
                };
                
                const content = JSON.stringify(updatedContent, null, 2);
                const encodedContent = btoa(unescape(encodeURIComponent(content)));
                
                // Update the file on GitHub
                const updateResponse = await fetch(API_URL, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Update doctors data via admin dashboard',
                        content: encodedContent,
                        sha: sha
                    })
                });
                
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.message || 'Failed to update file');
                }
                
                showAlert('تم حفظ جميع التغييرات على GitHub بنجاح', 'success');
                pendingChanges = false;
                saveAllBtn.disabled = true;
                hideLoading();
            } catch (error) {
                hideLoading();
                showAlert(`حدث خطأ أثناء حفظ التغييرات: ${error.message}`, 'danger');
                console.error('Error saving changes:', error);
            }
        }

        // Helper functions
        function generateNewId() {
            return doctorsData.length > 0 ? Math.max(...doctorsData.map(d => d.id)) + 1 : 1;
        }

        function formatTime(timeStr) {
            if (!timeStr) return '';
            
            // Convert 24-hour format to 12-hour format with ص/م
            const [hours, minutes] = timeStr.split(':');
            const hour = parseInt(hours);
            
            if (hour < 12) {
                return `${hour}:${minutes} ص`;
            } else if (hour === 12) {
                return `12:${minutes} م`;
            } else {
                return `${hour - 12}:${minutes} م`;
            }
        }

        function getRatingBadgeClass(rating) {
            if (rating >= 4.5) return 'badge-success';
            if (rating >= 3.5) return 'badge-primary';
            if (rating >= 2.5) return 'badge-warning';
            return 'badge-danger';
        }

        function showLoading() {
            loadingElement.style.display = 'flex';
        }

        function hideLoading() {
            loadingElement.style.display = 'none';
        }

        function showAlert(message, type) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type} animate__animated animate__fadeIn`;
            alert.innerHTML = `
                <span class="close-btn" onclick="this.parentElement.remove()">&times;</span>
                ${message}
            `;
            
            alertContainer.innerHTML = '';
            alertContainer.appendChild(alert);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }

        // Add one schedule day when page loads
        window.onload = addScheduleDay;