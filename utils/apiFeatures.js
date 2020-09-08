class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1A) Filtring
    const queryObj = { ...this.queryString };
    const excludedField = ['page', 'sort', 'limit', 'fields'];
    excludedField.forEach(el => delete queryObj[el]);

    // 1B) Advenced filtring
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      // DEFAULT SORT
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  search(teacherID) {
    if (this.queryString.search) {
      let searchBy = this.queryString.search;
      searchBy = searchBy.toLowerCase();

      const filter = teacherID
        ? {
            $or: [
              { firstName: `${searchBy}` },
              { lastName: `${searchBy}` },
              { name: `${searchBy}` }
            ],
            teacher: teacherID
          }
        : {
            $or: [
              { firstName: `${searchBy}` },
              { lastName: `${searchBy}` },
              { name: `${searchBy}` }
            ]
          };

      this.query = this.query.model.find(filter);
    } else {
      // DEFAULT SORT
      this.query = this.query.find();
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(`-__v ${fields}`);
    } else {
      // DEFAULT LIMIT
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; //Convert str -> float || default value
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
