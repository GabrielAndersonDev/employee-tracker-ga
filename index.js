const mysql = require('mysql2');
const inquirer = require('inquirer');
const Table = require('cli-table');

const db = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'employees_db',
    },
    console.log(`Connected to 'employees_db' :weary:`)
);

const startQuestions = ['View all departments', 'View all roles', 'View all employees', 'Add a department', 'Add a role', 'Add an employee', 'Update an employee role', 'Quit'];

function init() {

    inquirer
        .prompt([
            {
                type: 'list',
                name: 'start',
                message: 'What would you like to do?',
                choices: startQuestions,
            },
            {
                type: 'input',
                name: 'addDepartment',
                message: 'What is the name of the department?',
                when: (answers) => answers.start === startQuestions[3],
            },
            {
                type: 'input',
                name: 'addRole',
                message: 'What is the name of the role?',
                when: (answers) => answers.start === startQuestions[4],
            },
        ])
        .then((answers) => {
            const data = answers;

            if (data.start === startQuestions[0]) {

                db.query(`SELECT * FROM departments ORDER BY departments.id`, (err, rows) => {
                    if (err) {
                        console.log(err);
                    } else {
                        const departmentTable = new Table({
                            head: ['ID', 'Department']
                        });

                        rows.forEach((row) => {
                            departmentTable.push([row.id, row.department_name]);
                        });

                        console.log(departmentTable.toString());
                        init();
                    }
                });
                
            } else if (data.start === startQuestions[1]) {
                db.query(`SELECT * FROM roles ORDER BY roles.department_id`, (err, roles) => {
                    if (err) {
                        console.log(err);
                    } else {

                        const roleTable = new Table({
                            head: ['ID', 'Job Title', 'Department', 'Salary']
                        });

                        roles.forEach((role) => {
                            db.query(`SELECT department_name FROM departments WHERE id = ?`, [role.department_id], (err, depName) => {
                                if (err) {
                                    console.log(err);
                                } else {
                                    
                                    const departName = depName[0].department_name;
                                    roleTable.push([role.id, role.job_title, departName, role.salary]);

                                    if (roles.length === roleTable.length) {
                                        console.log(roleTable.toString());
                                        init();
                                    };
                                };
                            });
                        });
                    };
                });
                
            } else if (data.start === startQuestions[2]) {
                console.log(`employee list`);
                db.query(`SELECT * FROM employees`, (err, employees) => {
                    if (err) {
                        console.log(err);
                    } else {
                        const employeeTable = new Table([
                            'ID', 'First Name', 'Last Name', 'Title', 'Department', 'Salary', 'Manager'
                        ]);

                        nameList()
                            .then(() => {
                                employees.forEach((employee) => {

                                    var managerName = '';
                                    for (let i = 0; i < fullNameList.length; i++) {       
                                        if (employee.manager_id === fullNameList[i].id) {
                                            managerName = fullNameList[i].full_name;
                                            break;
                                        };
                                    };
                                    
                                    db.query(`SELECT * FROM roles WHERE id = ?`, [employee.role_id], (err, info) => {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            const employeeTitle = info[0].job_title;
                                            console.log(employeeTitle);
                                            console.log(info[0].job_title);
                                            
                                            const employeeSalary = info[0].salary;
                                            // console.log(employeeSalary);

                                            db.query(`SELECT department_name FROM departments WHERE id = ?`, [info[0].department_id], (err, empDep) => {
                                                if (err) {
                                                    console.log(err);
                                                } else {

                                                    const departmentName = empDep[0].department_name;
                                                    
                                                    employeeTable.push([employee.id, employee.first_name, employee.last_name, employeeTitle, departmentName, employeeSalary, managerName
                                                    ]);

                                                    if (employeeTable.length === employees.length) {
                                                        console.log(employeeTable.toString());
                                                        init();
                                                    }
                                                }
                                            });
                                        }
                                    });
                                });
                            })
                            .catch((err) => {
                                console.log(err);
                            });
                    }
                });

            } else if (data.start === startQuestions[5]) {
                roleCheck();
                nameList();
                newEmployee();
            };
    }
)};

async function newEmployee() {
    try {
        const answers = await inquirer
            .prompt([
                {
                    type: 'input',
                    name: 'firstName',
                    message: 'What is their first name?',
                },
                {
                    type: 'input',
                    name: 'lastName',
                    message: 'What is their last name?',
                },
                {
                    type: 'list',
                    name: 'title',
                    message: 'What job do they have?',
                    choices: roles,
                },
                {
                    type: 'list',
                    name: 'manager',
                    message: 'Who is their manager?',
                    choices: employeeList,
                },
            ]);
    
        var roleId;
        var managerId;
        
        const jobQuery = new Promise((resolve, reject) => {
            db.query(`SELECT id FROM roles WHERE job_title = ?`, [answers.title], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    roleId = rows[0].id;
                    resolve();
                }
            });
        });

        const name = answers.manager.split(" ");

        var first = name[0];
        var last = name[1];
        if (name[2]) {
            last = name[1] + ' ' + name[2];
        };

        const managerQuery = new Promise((resolve, reject) => {
            db.query(`SELECT id FROM employees WHERE first_name = ? AND last_name = ?`, [first, last], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    managerId = rows[0].id;
                    resolve();
                };
            });
        });

        await Promise.all([jobQuery, managerQuery]);

        
            const insertEmployee = new Promise((resolve, reject) => {
                db.query(`INSERT INTO employees (first_name, last_name, role_id, manager_id)
                VALUES (?, ?, ?, ?)`, [answers.firstName, answers.lastName, roleId, managerId], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {

                        console.log('Employee successfully added!');
                        resolve();
                    };
                }
            );
        });

        await insertEmployee;
        init();
    } catch (err) {
        console.log(err);
        init();
    }
};

var roles = [];

function roleCheck() {
    return new Promise((resolve, reject) => {
        db.query(`SELECT roles.job_title FROM roles`, (err, rows) => {
        if (err) {
            reject(err);
        } else {
            roles = rows.map((row) => row.job_title);
            resolve();
        };
        });
    })
};

var employeeList = [];
var fullNameList = [];

function nameList() {
    return new Promise((resolve, reject) => {
        db.query(`SELECT id, first_name, last_name, CONCAT(first_name, ' ', last_name) AS full_name FROM employees`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                employeeList = rows.map((row) => row.full_name);
                fullNameList = rows;
                resolve();
            };
        });
    })
    
};

init();