import React, { useEffect, useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';

const ProfileForm = () => {
  const { profileData, setProfileData, saveProfileData, nextStep, isLoading } = useOnboarding();
  const { user } = useAuth();
  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Auto-fill name and email from Supabase auth if available
  useEffect(() => {
    if (user) {
      // Auto-fill name if available
      if (user.user_metadata?.full_name && !profileData.name) {
        setProfileData(prev => ({ ...prev, name: user.user_metadata.full_name }));
      }

      // Auto-fill email if available
      if (user.email && !profileData.email) {
        setProfileData(prev => ({ ...prev, email: user.email }));
      }
    }
  }, [user, setProfileData, profileData.name, profileData.email]);

  // Validate form fields on change if form was previously submitted
  useEffect(() => {
    if (formSubmitted) {
      validateForm();
    }
  }, [profileData, formSubmitted]);

  // Get location using browser geolocation
  const detectLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const data = await response.json();

            // Handle cases where city might be empty
            const city = data.city || data.locality || data.principalSubdivision;
            const location = city + ', ' + data.countryName;

            setProfileData(prev => ({ ...prev, location }));

            // Clear location error if it exists
            if (errors.location) {
              setErrors(prev => ({ ...prev, location: null }));
            }
          } catch (error) {
            console.error('Error fetching location:', error);
            setErrors(prev => ({
              ...prev,
              location: 'Failed to detect location. Please enter manually.'
            }));
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
          setErrors(prev => ({
            ...prev,
            location: 'Location access denied. Please enter manually.'
          }));
        }
      );
    } else {
      setErrors(prev => ({
        ...prev,
        location: 'Geolocation is not supported by this browser. Please enter manually.'
      }));
      setLocationLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));

    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate all form fields
  const validateForm = () => {
    const newErrors = {};

    // Required field validation
    if (!profileData.name?.trim()) newErrors.name = 'Name is required';
    if (!profileData.age) newErrors.age = 'Age is required';
    if (!profileData.gender) newErrors.gender = 'Gender is required';
    if (!profileData.currentClass) newErrors.currentClass = 'Current class is required';
    if (!profileData.location?.trim()) newErrors.location = 'Location is required';

    // Name validation - only letters, spaces, and common name characters
    if (profileData.name?.trim() && !/^[A-Za-z\s'.,-]+$/.test(profileData.name.trim())) {
      newErrors.name = 'Please enter a valid name';
    }

    // Age validation
    if (profileData.age && (profileData.age < 13 || profileData.age > 100)) {
      newErrors.age = 'Age must be between 13 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);

    // Validate form
    const isValid = validateForm();
    if (!isValid) return;

    try {
      // Save profile data to Supabase
      const success = await saveProfileData();
      if (success) {
        nextStep();
      } else {
        setErrors(prev => ({
          ...prev,
          form: 'Failed to save profile data. Please try again.'
        }));
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors(prev => ({
        ...prev,
        form: 'An unexpected error occurred. Please try again.'
      }));
      alert('Save Error: ' + error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-white-800">Tell us about yourself</h2>
      {errors.form && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{errors.form}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="form-group">
          <label htmlFor="name" className="block mb-1 font-medium text-white-700">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={profileData.name || ''}
            onChange={handleChange}
            placeholder="Enter your full name"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none  text-black focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.name && <div className="mt-1 text-sm text-red-600">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="email" className="block mb-1 font-medium text-white-700">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={profileData.email || ''}
            onChange={handleChange}
            placeholder="Enter your email"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none text-black focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'} ${user?.email ? 'bg-gray-100' : ''}`}
            disabled={user?.email} // Disable if auto-filled from auth
          />
          {errors.email && <div className="mt-1 text-sm text-red-600">{errors.email}</div>}
          {user?.email && <div className="mt-1 text-xs text-white-500">Email auto-filled from your account</div>}
        </div>

        <div className="form-group">
          <label htmlFor="age" className="block mb-1 font-medium text-white-700">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            min="13"
            max="100"
            value={profileData.age || ''}
            onChange={handleChange}
            placeholder="Enter your age"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none text-black focus:ring-2 focus:ring-blue-500 ${errors.age ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.age && <div className="mt-1 text-sm text-red-600">{errors.age}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="gender" className="block mb-1 font-medium text-white-700">Gender</label>
          <select
            id="gender"
            name="gender"
            value={profileData.gender || ''}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md text-black focus:outline-none text-blackfocus:ring-2 focus:ring-blue-500 ${errors.gender ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="" disabled>Select your gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          {errors.gender && <div className="mt-1 text-sm text-red-600">{errors.gender}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="currentClass" className="block mb-1 font-medium text-white-700">Current Class/Grade</label>
          <select
            id="currentClass"
            name="currentClass"
            value={profileData.currentClass || ''}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none text-black focus:ring-2 focus:ring-blue-500 ${errors.currentClass ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="" disabled>Select your current class</option>
            <option value="class-9">Class 9</option>
            <option value="class-10">Class 10</option>
            <option value="class-11">Class 11</option>
            <option value="class-12">Class 12</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
            <option value="other">Other</option>
          </select>
          {errors.currentClass && <div className="mt-1 text-sm text-red-600">{errors.currentClass}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="location" className="block mb-1 font-medium text-white-700">Location</label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="location"
              name="location"
              value={profileData.location || ''}
              onChange={handleChange}
              placeholder="Enter your city, country"
              className={`flex-1 px-3 py-2 border rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
            />
            <button
              type="button"
              onClick={detectLocation}
              className="group flex h-[48px] w-[48px] items-center justify-center rounded-lg bg-white/5 ring-1 ring-inset ring-primary/30 hover:bg-primary/20 transition-all duration-300 backdrop-blur-sm"
              disabled={locationLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary group-hover:text-white transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </button>
          </div>
          {errors.location && <div className="mt-1 text-sm text-red-600">{errors.location}</div>}
        </div>

        <div className="form-actions pt-4">
          <button
            type="submit"
            className="w-full py-2 px-4 bg-emerald-400 hover:bg-emerald-500 text-black font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            disabled={isLoading}
            style={{ backgroundColor: '#39FF14' }}
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;