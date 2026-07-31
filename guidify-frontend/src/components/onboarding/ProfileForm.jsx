import React, { useEffect, useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { User, Mail, Cake, Users, GraduationCap, MapPin, Navigation } from 'lucide-react';

const FormContainer = styled(motion.div)`
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  margin: 0 auto;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  position: relative;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.3rem;
  color: #A4ACBC;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Icon = styled.div`
  position: absolute;
  left: 1rem;
  color: #64748B;
  pointer-events: none;
`;

const Input = styled.input`
  width: 100%;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.6rem 1rem 0.6rem 2.8rem;
  color: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #39FF14;
    box-shadow: 0 0 0 2px rgba(57, 255, 20, 0.1);
    background: rgba(15, 23, 42, 0.8);
  }

  &::placeholder {
    color: #475569;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.6rem 1rem 0.6rem 2.8rem;
  color: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1em;

  &:focus {
    outline: none;
    border-color: #39FF14;
    box-shadow: 0 0 0 2px rgba(57, 255, 20, 0.1);
  }
  
  option {
    background: #1e293b;
    color: white;
  }
`;

const ErrorMsg = styled.div`
  color: #ff4d4d;
  font-size: 0.8rem;
  margin-top: 0.2rem;
  margin-left: 0.2rem;
`;

const LocationButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(57, 255, 20, 0.1);
  border: 1px solid rgba(57, 255, 20, 0.2);
  color: #39FF14;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(57, 255, 20, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: #39FF14;
  color: black;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(57, 255, 20, 0.3);
  margin-top: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(57, 255, 20, 0.4);
    background: #32e612;
  }

  &:disabled {
    background: #1f2937;
    color: #4b5563;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ProfileForm = () => {
  const { profileData, setProfileData, saveProfileData, isLoading } = useOnboarding();
  const { user } = useAuth();
  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Auto-fill name and email from Supabase auth if available
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.full_name && !profileData.name) {
        setProfileData(prev => ({ ...prev, name: user.user_metadata.full_name }));
      }
      if (user.email && !profileData.email) {
        setProfileData(prev => ({ ...prev, email: user.email }));
      }
    }
  }, [user, setProfileData, profileData.name, profileData.email]);

  useEffect(() => {
    if (formSubmitted) validateForm();
  }, [profileData, formSubmitted]);

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
            const city = data.city || data.locality || data.principalSubdivision || '';
            const location = city + (city ? ', ' : '') + data.countryName;

            setProfileData(prev => ({ ...prev, location }));
            if (errors.location) setErrors(prev => ({ ...prev, location: null }));
          } catch (error) {
            console.error('Error fetching location:', error);
            setErrors(prev => ({ ...prev, location: 'Failed to detect location. Enter manually.' }));
          } finally {
            setLocationLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
          setErrors(prev => ({ ...prev, location: 'Access denied. Enter manually.' }));
        }
      );
    } else {
      setErrors(prev => ({ ...prev, location: 'Geolocation not supported. Enter manually.' }));
      setLocationLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!profileData.name?.trim()) newErrors.name = 'Full Name is required';
    if (!profileData.age) newErrors.age = 'Age is required';
    else if (profileData.age < 13 || profileData.age > 100) newErrors.age = 'Age must be 13-100';
    if (!profileData.gender) newErrors.gender = 'Gender is required';
    if (!profileData.currentClass) newErrors.currentClass = 'Current Class is required';
    if (!profileData.location?.trim()) newErrors.location = 'Location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    if (!validateForm()) return;

    try {
      const success = await saveProfileData();
      if (!success) setErrors(prev => ({ ...prev, form: 'Failed to save. Try again.' }));
    } catch (error) {
      setErrors(prev => ({ ...prev, form: error.message }));
    }
  };

  return (
    <FormContainer
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.2rem', textAlign: 'center', color: 'white' }}>
        Tell us about yourself
      </h2>

      {errors.form && (
        <div style={{ padding: '0.8rem', background: 'rgba(255, 77, 77, 0.2)', color: '#ff4d4d', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormGroup>
          <Label><User size={16} /> Full Name</Label>
          <InputWrapper>
            <Input
              type="text"
              name="name"
              value={profileData.name || ''}
              onChange={handleChange}
              placeholder="e.g. Rahul Kumar"
              style={{ paddingLeft: '1rem' }}
            />
          </InputWrapper>
          {errors.name && <ErrorMsg>{errors.name}</ErrorMsg>}
        </FormGroup>

        <FormGroup>
          <Label><Mail size={16} /> Email</Label>
          <InputWrapper>
            <Input
              type="email"
              name="email"
              value={profileData.email || ''}
              disabled={!!user?.email}
              onChange={handleChange}
              style={{ opacity: user?.email ? 0.6 : 1, cursor: user?.email ? 'not-allowed' : 'text', paddingLeft: '1rem' }}
            />
          </InputWrapper>
          {user?.email && <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.3rem' }}>Auto-filled from login</div>}
        </FormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormGroup>
            <Label><Cake size={16} /> Age</Label>
            <InputWrapper>
              <Input
                type="number"
                name="age"
                value={profileData.age || ''}
                onChange={handleChange}
                placeholder="13-100"
                style={{ paddingLeft: '1rem' }}
              />
            </InputWrapper>
            {errors.age && <ErrorMsg>{errors.age}</ErrorMsg>}
          </FormGroup>

          <FormGroup>
            <Label><Users size={16} /> Gender</Label>
            <InputWrapper>
              <Select name="gender" value={profileData.gender || ''} onChange={handleChange} style={{ paddingLeft: '1rem' }}>
                <option value="" disabled>Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </Select>
            </InputWrapper>
            {errors.gender && <ErrorMsg>{errors.gender}</ErrorMsg>}
          </FormGroup>
        </div>

        <FormGroup>
          <Label><GraduationCap size={16} /> Current Status</Label>
          <InputWrapper>
            <Select name="currentClass" value={profileData.currentClass || ''} onChange={handleChange} style={{ paddingLeft: '1rem' }}>
              <option value="" disabled>Select your status</option>
              <option value="class-9">Class 9</option>
              <option value="class-10">Class 10</option>
              <option value="class-11">Class 11</option>
              <option value="class-12">Class 12</option>
              <option value="undergraduate">Undergraduate Student</option>
              <option value="graduate">Graduate (Job Seeker)</option>
              <option value="working">Working Professional</option>
              <option value="other">Other</option>
            </Select>
          </InputWrapper>
          {errors.currentClass && <ErrorMsg>{errors.currentClass}</ErrorMsg>}
        </FormGroup>

        <FormGroup>
          <Label><MapPin size={16} /> Location</Label>
          <InputWrapper>
            <Input
              type="text"
              name="location"
              value={profileData.location || ''}
              onChange={handleChange}
              placeholder="City, Country"
              style={{ paddingLeft: '1rem', paddingRight: '3rem' }}
            />
            <LocationButton type="button" onClick={detectLocation} disabled={locationLoading} title="Auto-detect location">
              {locationLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Navigation size={16} /></motion.div> : <Navigation size={16} />}
            </LocationButton>
          </InputWrapper>
          {errors.location && <ErrorMsg>{errors.location}</ErrorMsg>}
        </FormGroup>

        <SubmitButton type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Continue'}
        </SubmitButton>
      </form>
    </FormContainer>
  );
};

export default ProfileForm;