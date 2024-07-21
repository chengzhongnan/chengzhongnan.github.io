import keygen from './keygen.js'

document.getElementById('create').addEventListener('click', () => {
    const regMathID = new RegExp('\\d{4}-\\d{5}-\\d{5}')
    const mathID = document.getElementById('math-id').value
    if (!regMathID.test(mathID)) {
        alert('Math ID无效，请重新输入')
        return
    }
    const regActivationKey = new RegExp('\\d{4}-\\d{4}-\\d{6}')
    let activationKey = document.getElementById('activation-key').value
    if (activationKey === '') activationKey = '1234-4321-123456'
    if (!regActivationKey.test(activationKey)) {
        alert('激活密钥无效，请重新输入')
        return
    }
    const password = keygen(mathID, activationKey)
    document.getElementById('password').value = password.join('\n')
})