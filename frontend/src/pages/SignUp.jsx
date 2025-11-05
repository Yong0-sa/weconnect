import './SignUp.css';
import { useState } from 'react';

function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    nickname: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleVerifyEmail = () => {
    console.log('이메일 인증 요청:', formData.email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('회원가입 데이터:', formData);
  };

  return (
    <div className="signup-page">
      <div className="modal-content">
        <div className="modal-header">
          <h1>회원가입</h1>
        </div>
        
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이메일</label>
            <div className="email-input">
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                required 
              />
              <button type="button" className="verify-btn" onClick={handleVerifyEmail}>
                인증
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>이름</label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>전화번호</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>닉네임</label>
            <input 
              type="text" 
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>비밀번호</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>비밀번호 확인</label>
            <input 
              type="password" 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
            />
          </div>
          
          <button type="submit" className="submit-btn">가입하기</button>
        </form>
      </div>
    </div>
  );
}

export default SignUp;